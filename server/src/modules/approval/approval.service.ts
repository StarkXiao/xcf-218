import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { ApprovalFlow } from '../../entities/approval-flow.entity';
import { ApprovalNode } from '../../entities/approval-node.entity';
import { ApprovalRecord } from '../../entities/approval-record.entity';
import { ApprovalComment } from '../../entities/approval-comment.entity';
import { ApprovalHistory } from '../../entities/approval-history.entity';
import { Application } from '../../entities/application.entity';
import { User } from '../../entities/user.entity';
import { Message } from '../../entities/message.entity';
import { ProgressRecord } from '../../entities/progress-record.entity';

interface StartApprovalDto {
  applicationId: number;
  flowCode: string;
  operatorId: number;
}

interface ProcessApprovalDto {
  recordId: number;
  approverId: number;
  action: 'approve' | 'reject' | 'transfer';
  comment: string;
  targetNodeId?: number;
  transferToUserId?: number;
}

export interface TimelineNode {
  nodeId: number;
  nodeName: string;
  nodeOrder: number;
  role: string;
  department?: string;
  status: 'pending' | 'current' | 'completed' | 'rejected' | 'skipped';
  approver?: { id: number; name: string };
  approvedAt?: Date;
  comment?: string;
  duration?: number;
  createdAt?: Date;
}

@Injectable()
export class ApprovalService {
  constructor(
    @InjectRepository(ApprovalFlow) private readonly flowRepository: Repository<ApprovalFlow>,
    @InjectRepository(ApprovalNode) private readonly nodeRepository: Repository<ApprovalNode>,
    @InjectRepository(ApprovalRecord) private readonly recordRepository: Repository<ApprovalRecord>,
    @InjectRepository(ApprovalComment) private readonly commentRepository: Repository<ApprovalComment>,
    @InjectRepository(ApprovalHistory) private readonly historyRepository: Repository<ApprovalHistory>,
    @InjectRepository(Application) private readonly applicationRepository: Repository<Application>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(Message) private readonly messageRepository: Repository<Message>,
    @InjectRepository(ProgressRecord) private readonly progressRepository: Repository<ProgressRecord>,
    private readonly dataSource: DataSource,
  ) {}

  async createFlow(flowData: Partial<ApprovalFlow>, nodes: Partial<ApprovalNode>[]) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const flow = queryRunner.manager.create(ApprovalFlow, flowData);
      const savedFlow = await queryRunner.manager.save(flow);

      for (const nodeData of nodes) {
        const node = queryRunner.manager.create(ApprovalNode, {
          ...nodeData,
          flowId: savedFlow.id,
        });
        await queryRunner.manager.save(node);
      }

      await queryRunner.commitTransaction();
      return this.findFlowById(savedFlow.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findFlowById(id: number) {
    const flow = await this.flowRepository.findOne({
      where: { id },
      relations: ['nodes'],
    });
    if (!flow) throw new NotFoundException('审批流程不存在');
    const sortedNodes = flow.nodes.sort((a, b) => a.nodeOrder - b.nodeOrder);
    return { ...flow, nodes: sortedNodes };
  }

  async findFlowByCode(code: string) {
    const flow = await this.flowRepository.findOne({
      where: { code, isActive: true },
      relations: ['nodes'],
    });
    if (!flow) throw new NotFoundException('审批流程不存在');
    const sortedNodes = flow.nodes.sort((a, b) => a.nodeOrder - b.nodeOrder);
    return { ...flow, nodes: sortedNodes };
  }

  async findAllFlows() {
    const flows = await this.flowRepository.find({
      where: { isActive: true },
      relations: ['nodes'],
      order: { createdAt: 'DESC' },
    });
    return flows.map(flow => ({
      ...flow,
      nodes: flow.nodes.sort((a, b) => a.nodeOrder - b.nodeOrder),
    }));
  }

  async startApproval(dto: StartApprovalDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const application = await queryRunner.manager.findOne(Application, {
        where: { id: dto.applicationId },
        relations: ['serviceItem'],
      });
      if (!application) throw new NotFoundException('申请不存在');

      const existingRecord = await queryRunner.manager.findOne(ApprovalRecord, {
        where: { applicationId: dto.applicationId, status: In(['pending', 'approved']) },
      });
      if (existingRecord) throw new BadRequestException('该申请已在审批流程中');

      const flow = await this.findFlowByCode(dto.flowCode);
      const firstNode = flow.nodes[0];
      if (!firstNode) throw new BadRequestException('审批流程未配置节点');

      const approver = await this.findApproverForNode(firstNode);

      const record = queryRunner.manager.create(ApprovalRecord, {
        applicationId: dto.applicationId,
        flowId: flow.id,
        currentNodeId: firstNode.id,
        approverId: approver?.id,
        status: 'pending',
      });
      const savedRecord = await queryRunner.manager.save(record);

      await queryRunner.manager.save(ApprovalHistory, {
        applicationId: dto.applicationId,
        flowId: flow.id,
        nodeId: firstNode.id,
        operatorId: dto.operatorId,
        action: 'enter',
        remark: `进入审批节点：${firstNode.nodeName}`,
      });

      await queryRunner.manager.save(ProgressRecord, {
        applicationId: dto.applicationId,
        step: `进入审批：${firstNode.nodeName}`,
        status: 'processing',
        remark: `审批角色：${firstNode.role}${firstNode.department ? `（${firstNode.department}）` : ''}`,
        operatorId: approver?.id,
      });

      application.status = 'reviewing';
      await queryRunner.manager.save(application);

      if (approver) {
        await this.sendApprovalNotification(approver.id, application, firstNode, queryRunner);
      }

      await queryRunner.commitTransaction();
      return this.findRecordById(savedRecord.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async processApproval(dto: ProcessApprovalDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const record = await queryRunner.manager.findOne(ApprovalRecord, {
        where: { id: dto.recordId },
        relations: ['currentNode', 'approver', 'application', 'application.serviceItem'],
      });
      if (!record) throw new NotFoundException('审批记录不存在');
      if (record.status !== 'pending') throw new BadRequestException('该审批已处理');

      if (record.approverId && record.approverId !== dto.approverId) {
        const assignedApprover = record.approver;
        throw new ForbiddenException(
          `当前审批已指派给「${assignedApprover?.name || '其他人员'}」处理，您无权操作`,
        );
      }

      if (!record.approverId) {
        const node = record.currentNode;
        const currentUser = await this.userRepository.findOne({ where: { id: dto.approverId } });
        if (!currentUser) throw new NotFoundException('操作人不存在');
        if (currentUser.role !== node.role) {
          throw new ForbiddenException(
            `当前节点要求「${node.role}」角色审批，您的角色为「${currentUser.role}」，无权操作`,
          );
        }
      }

      const flow = await this.findFlowById(record.flowId);
      const currentNode = record.currentNode;

      if (dto.action === 'approve') {
        await this.handleApprove(record, flow, currentNode, dto, queryRunner);
      } else if (dto.action === 'reject') {
        if (!currentNode.allowReject) throw new BadRequestException('当前节点不允许驳回');
        await this.handleReject(record, flow, currentNode, dto, queryRunner);
      } else if (dto.action === 'transfer') {
        if (!currentNode.allowTransfer) throw new BadRequestException('当前节点不允许转交');
        await this.handleTransfer(record, currentNode, dto, queryRunner);
      }

      await queryRunner.commitTransaction();
      return this.findRecordById(record.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async handleApprove(
    record: ApprovalRecord,
    flow: any,
    currentNode: ApprovalNode,
    dto: ProcessApprovalDto,
    queryRunner: any,
  ) {
    record.status = 'approved';
    record.approverId = dto.approverId;
    record.comment = dto.comment;
    record.approvedAt = new Date();
    await queryRunner.manager.save(record);

    await queryRunner.manager.save(ApprovalComment, {
      recordId: record.id,
      nodeId: currentNode.id,
      commenterId: dto.approverId,
      action: 'approve',
      content: dto.comment,
    });

    await queryRunner.manager.save(ApprovalHistory, {
      applicationId: record.applicationId,
      flowId: flow.id,
      nodeId: currentNode.id,
      operatorId: dto.approverId,
      action: 'approve',
      remark: dto.comment,
    });

    await queryRunner.manager.save(ProgressRecord, {
      applicationId: record.applicationId,
      step: `${currentNode.nodeName} - 通过`,
      status: 'completed',
      remark: dto.comment,
      operatorId: dto.approverId,
    });

    const currentIndex = flow.nodes.findIndex((n: ApprovalNode) => n.id === currentNode.id);
    const nextNode = flow.nodes[currentIndex + 1];

    if (nextNode) {
      const nextApprover = await this.findApproverForNode(nextNode);
      const newRecord = queryRunner.manager.create(ApprovalRecord, {
        applicationId: record.applicationId,
        flowId: flow.id,
        currentNodeId: nextNode.id,
        approverId: nextApprover?.id,
        status: 'pending',
      });
      await queryRunner.manager.save(newRecord);

      await queryRunner.manager.save(ApprovalHistory, {
        applicationId: record.applicationId,
        flowId: flow.id,
        nodeId: nextNode.id,
        operatorId: dto.approverId,
        action: 'enter',
        remark: `进入审批节点：${nextNode.nodeName}`,
        previousNodeId: currentNode.id,
      });

      await queryRunner.manager.save(ProgressRecord, {
        applicationId: record.applicationId,
        step: `进入审批：${nextNode.nodeName}`,
        status: 'processing',
        remark: `审批角色：${nextNode.role}${nextNode.department ? `（${nextNode.department}）` : ''}`,
        operatorId: nextApprover?.id,
      });

      if (nextApprover) {
        await this.sendApprovalNotification(nextApprover.id, record.application, nextNode, queryRunner);
      }
    } else {
      await queryRunner.manager.save(ApprovalHistory, {
        applicationId: record.applicationId,
        flowId: flow.id,
        nodeId: currentNode.id,
        operatorId: dto.approverId,
        action: 'complete',
        remark: '审批流程全部完成',
      });

      await queryRunner.manager.save(ProgressRecord, {
        applicationId: record.applicationId,
        step: '审批完成',
        status: 'completed',
        remark: '所有审批节点已通过',
        operatorId: dto.approverId,
      });

      const application = await queryRunner.manager.findOne(Application, {
        where: { id: record.applicationId },
      });
      if (application) {
        application.status = 'approved';
        await queryRunner.manager.save(application);
      }

      await this.sendCompletionNotification(record.applicationId, record.application, queryRunner);
    }
  }

  private async handleReject(
    record: ApprovalRecord,
    flow: any,
    currentNode: ApprovalNode,
    dto: ProcessApprovalDto,
    queryRunner: any,
  ) {
    record.status = 'rejected';
    record.approverId = dto.approverId;
    record.comment = dto.comment;
    record.approvedAt = new Date();
    await queryRunner.manager.save(record);

    await queryRunner.manager.save(ApprovalComment, {
      recordId: record.id,
      nodeId: currentNode.id,
      commenterId: dto.approverId,
      action: 'reject',
      content: dto.comment,
      targetNodeId: dto.targetNodeId,
    });

    await queryRunner.manager.save(ApprovalHistory, {
      applicationId: record.applicationId,
      flowId: flow.id,
      nodeId: currentNode.id,
      operatorId: dto.approverId,
      action: 'reject',
      remark: dto.comment,
      targetNodeId: dto.targetNodeId,
    });

    await queryRunner.manager.save(ProgressRecord, {
      applicationId: record.applicationId,
      step: `${currentNode.nodeName} - 驳回`,
      status: 'failed',
      remark: dto.comment,
      operatorId: dto.approverId,
    });

    const targetNode = dto.targetNodeId
      ? flow.nodes.find((n: ApprovalNode) => n.id === dto.targetNodeId)
      : null;

    if (targetNode) {
      const targetApprover = await this.findApproverForNode(targetNode);
      const newRecord = queryRunner.manager.create(ApprovalRecord, {
        applicationId: record.applicationId,
        flowId: flow.id,
        currentNodeId: targetNode.id,
        approverId: targetApprover?.id,
        status: 'pending',
      });
      await queryRunner.manager.save(newRecord);

      await queryRunner.manager.save(ApprovalHistory, {
        applicationId: record.applicationId,
        flowId: flow.id,
        nodeId: targetNode.id,
        operatorId: dto.approverId,
        action: 'enter',
        remark: `驳回到节点：${targetNode.nodeName}`,
        previousNodeId: currentNode.id,
      });

      await queryRunner.manager.save(ProgressRecord, {
        applicationId: record.applicationId,
        step: `驳回到：${targetNode.nodeName}`,
        status: 'processing',
        remark: dto.comment,
        operatorId: targetApprover?.id,
      });

      if (targetApprover) {
        await this.sendRejectNotification(targetApprover.id, record.application, targetNode, currentNode, dto.comment, queryRunner);
      }
    } else {
      const application = await queryRunner.manager.findOne(Application, {
        where: { id: record.applicationId },
      });
      if (application) {
        application.status = 'rejected';
        await queryRunner.manager.save(application);
      }

      await this.sendRejectToApplicantNotification(record.applicationId, record.application, currentNode, dto.comment, queryRunner);
    }
  }

  private async handleTransfer(
    record: ApprovalRecord,
    currentNode: ApprovalNode,
    dto: ProcessApprovalDto,
    queryRunner: any,
  ) {
    record.status = 'transferred';
    record.approverId = dto.approverId;
    record.comment = dto.comment;
    record.approvedAt = new Date();
    await queryRunner.manager.save(record);

    await queryRunner.manager.save(ApprovalComment, {
      recordId: record.id,
      nodeId: currentNode.id,
      commenterId: dto.approverId,
      action: 'transfer',
      content: dto.comment,
      transferredToUserId: dto.transferToUserId,
    });

    await queryRunner.manager.save(ApprovalHistory, {
      applicationId: record.applicationId,
      flowId: record.flowId,
      nodeId: currentNode.id,
      operatorId: dto.approverId,
      action: 'transfer',
      remark: dto.comment,
      targetNodeId: dto.transferToUserId ? undefined : currentNode.id,
    });

    const newRecord = queryRunner.manager.create(ApprovalRecord, {
      applicationId: record.applicationId,
      flowId: record.flowId,
      currentNodeId: currentNode.id,
      approverId: dto.transferToUserId,
      status: 'pending',
    });
    await queryRunner.manager.save(newRecord);

    await queryRunner.manager.save(ProgressRecord, {
      applicationId: record.applicationId,
      step: `${currentNode.nodeName} - 转交`,
      status: 'processing',
      remark: dto.comment,
      operatorId: dto.transferToUserId,
    });

    if (dto.transferToUserId) {
      await this.sendTransferNotification(dto.transferToUserId, record.application, currentNode, dto.comment, queryRunner);
    }
  }

  async withdraw(recordId: number, operatorId: number, reason: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const record = await queryRunner.manager.findOne(ApprovalRecord, {
        where: { id: recordId },
        relations: ['currentNode', 'application'],
      });
      if (!record) throw new NotFoundException('审批记录不存在');
      if (record.status !== 'pending') throw new BadRequestException('只能撤回待处理的审批');

      if (record.application.userId !== operatorId) {
        throw new ForbiddenException('只有申请人可以撤回审批');
      }

      record.status = 'withdrawn';
      record.approverId = operatorId;
      record.comment = reason;
      record.approvedAt = new Date();
      await queryRunner.manager.save(record);

      await queryRunner.manager.save(ApprovalComment, {
        recordId: record.id,
        nodeId: record.currentNodeId,
        commenterId: operatorId,
        action: 'withdraw',
        content: reason,
      });

      await queryRunner.manager.save(ApprovalHistory, {
        applicationId: record.applicationId,
        flowId: record.flowId,
        nodeId: record.currentNodeId,
        operatorId: operatorId,
        action: 'withdraw',
        remark: reason,
      });

      await queryRunner.manager.save(ProgressRecord, {
        applicationId: record.applicationId,
        step: '审批撤回',
        status: 'cancelled',
        remark: reason,
        operatorId: operatorId,
      });

      const application = await queryRunner.manager.findOne(Application, {
        where: { id: record.applicationId },
      });
      if (application) {
        application.status = 'pending';
        await queryRunner.manager.save(application);
      }

      await queryRunner.commitTransaction();
      return this.findRecordById(record.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findRecordById(id: number) {
    const record = await this.recordRepository.findOne({
      where: { id },
      relations: ['currentNode', 'approver', 'application', 'application.serviceItem', 'comments', 'comments.node', 'comments.commenter'],
    });
    if (!record) throw new NotFoundException('审批记录不存在');
    return this.transformRecord(record);
  }

  async findRecordByApplicationId(applicationId: number) {
    const records = await this.recordRepository.find({
      where: { applicationId },
      relations: ['currentNode', 'approver', 'comments', 'comments.node', 'comments.commenter'],
      order: { createdAt: 'ASC' },
    });
    return records.map(r => this.transformRecord(r));
  }

  async findPendingRecords(approverId?: number, role?: string) {
    const where: any = { status: 'pending' };
    const records = await this.recordRepository.find({
      where,
      relations: ['currentNode', 'approver', 'application', 'application.serviceItem', 'application.user'],
      order: { createdAt: 'ASC' },
    });

    return records
      .filter(r => {
        if (approverId && r.approverId === approverId) return true;
        if (role && r.currentNode?.role === role) return true;
        return false;
      })
      .map(r => this.transformRecord(r));
  }

  async getTimeline(applicationId: number) {
    const records = await this.recordRepository.find({
      where: { applicationId },
      relations: ['currentNode', 'approver'],
      order: { createdAt: 'ASC' },
    });

    if (records.length === 0) {
      return [];
    }

    const flowId = records[0].flowId;
    const flow = await this.findFlowById(flowId);

    const histories = await this.historyRepository.find({
      where: { applicationId },
      relations: ['node', 'operator'],
      order: { createdAt: 'ASC' },
    });

    const timeline: TimelineNode[] = flow.nodes.map((node: ApprovalNode) => {
      const nodeRecords = records.filter(r => r.currentNodeId === node.id);
      const approvedRecord = nodeRecords.find(r => r.status === 'approved');
      const pendingRecord = nodeRecords.find(r => r.status === 'pending');
      const rejectedRecord = nodeRecords.find(r => r.status === 'rejected');
      const nodeHistories = histories.filter(h => h.nodeId === node.id);

      let status: TimelineNode['status'] = 'pending';
      if (approvedRecord) status = 'completed';
      else if (pendingRecord) status = 'current';
      else if (rejectedRecord) status = 'rejected';

      const activeRecord = approvedRecord || pendingRecord || rejectedRecord;

      return {
        nodeId: node.id,
        nodeName: node.nodeName,
        nodeOrder: node.nodeOrder,
        role: node.role,
        department: node.department,
        status,
        approver: activeRecord?.approver ? { id: activeRecord.approver.id, name: activeRecord.approver.name } : undefined,
        approvedAt: activeRecord?.approvedAt,
        comment: activeRecord?.comment || nodeHistories.find(h => h.action === 'approve' || h.action === 'reject')?.remark,
        createdAt: nodeHistories[0]?.createdAt,
      };
    });

    return timeline.sort((a, b) => a.nodeOrder - b.nodeOrder);
  }

  async getComments(applicationId: number) {
    const records = await this.recordRepository.find({ where: { applicationId } });
    const recordIds = records.map(r => r.id);

    const comments = await this.commentRepository.find({
      where: { recordId: In(recordIds) },
      relations: ['node', 'commenter'],
      order: { createdAt: 'DESC' },
    });

    return comments.map(c => ({
      id: c.id,
      nodeName: c.node?.nodeName,
      commenterName: c.commenter?.name,
      action: c.action,
      content: c.content,
      createdAt: c.createdAt,
    }));
  }

  async getRejectableNodes(applicationId: number) {
    const records = await this.recordRepository.find({
      where: { applicationId, status: 'approved' },
      relations: ['currentNode'],
      order: { createdAt: 'ASC' },
    });

    return records.map(r => ({
      nodeId: r.currentNodeId,
      nodeName: r.currentNode?.nodeName,
      nodeOrder: r.currentNode?.nodeOrder,
    }));
  }

  private async findApproverForNode(node: ApprovalNode): Promise<User | null> {
    const user = await this.userRepository.findOne({
      where: { role: node.role },
    });
    return user;
  }

  private async sendApprovalNotification(userId: number, application: any, node: ApprovalNode, queryRunner: any) {
    await queryRunner.manager.save(Message, {
      userId,
      title: '待办审批提醒',
      content: `您有一个新的审批待处理：${application.serviceItem?.name}（编号：${application.applicationNo}），审批节点：${node.nodeName}`,
      type: 'approval',
      applicationId: application.id,
    });
  }

  private async sendCompletionNotification(applicationId: number, application: any, queryRunner: any) {
    const app = await queryRunner.manager.findOne(Application, {
      where: { id: applicationId },
      relations: ['user'],
    });
    if (app?.user) {
      await queryRunner.manager.save(Message, {
        userId: app.user.id,
        title: '审批完成通知',
        content: `您的申请（编号：${application.applicationNo}）已完成全部审批流程，请查看办理结果。`,
        type: 'application',
        applicationId: applicationId,
      });
    }
  }

  private async sendRejectNotification(userId: number, application: any, targetNode: ApprovalNode, fromNode: ApprovalNode, comment: string, queryRunner: any) {
    await queryRunner.manager.save(Message, {
      userId,
      title: '审批被驳回提醒',
      content: `申请（编号：${application.applicationNo}）在「${fromNode.nodeName}」被驳回，已退回至「${targetNode.nodeName}」。驳回意见：${comment}`,
      type: 'approval',
      applicationId: application.id,
    });
  }

  private async sendRejectToApplicantNotification(applicationId: number, application: any, node: ApprovalNode, comment: string, queryRunner: any) {
    const app = await queryRunner.manager.findOne(Application, {
      where: { id: applicationId },
      relations: ['user'],
    });
    if (app?.user) {
      await queryRunner.manager.save(Message, {
        userId: app.user.id,
        title: '申请被驳回通知',
        content: `您的申请（编号：${application.applicationNo}）在「${node.nodeName}」被驳回。驳回意见：${comment}`,
        type: 'application',
        applicationId: applicationId,
      });
    }
  }

  private async sendTransferNotification(userId: number, application: any, node: ApprovalNode, comment: string, queryRunner: any) {
    await queryRunner.manager.save(Message, {
      userId,
      title: '审批转交提醒',
      content: `您收到一个转交的审批：${application.serviceItem?.name}（编号：${application.applicationNo}），审批节点：${node.nodeName}。转交意见：${comment}`,
      type: 'approval',
      applicationId: application.id,
    });
  }

  private transformRecord(record: ApprovalRecord) {
    return {
      ...record,
      application: record.application ? {
        ...record.application,
        formData: record.application.formData ? JSON.parse(record.application.formData) : null,
        user: record.application.user ? { ...record.application.user, password: undefined } : undefined,
      } : undefined,
    };
  }

  async getApproversByRole(role: string) {
    return this.userRepository.find({
      where: { role },
      select: ['id', 'name', 'username', 'role'],
    });
  }
}
