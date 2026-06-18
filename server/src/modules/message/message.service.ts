import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from '../../entities/message.entity';
import { ApprovalRecord } from '../../entities/approval-record.entity';
import { Application } from '../../entities/application.entity';
import { WithdrawalRecord } from '../../entities/withdrawal-record.entity';
import { SupplementRecord } from '../../entities/supplement-record.entity';
import { User } from '../../entities/user.entity';

@Injectable()
export class MessageService {
  constructor(
    @InjectRepository(Message) private readonly repository: Repository<Message>,
    @InjectRepository(ApprovalRecord) private readonly approvalRecordRepository: Repository<ApprovalRecord>,
    @InjectRepository(Application) private readonly applicationRepository: Repository<Application>,
    @InjectRepository(WithdrawalRecord) private readonly withdrawalRepository: Repository<WithdrawalRecord>,
    @InjectRepository(SupplementRecord) private readonly supplementRepository: Repository<SupplementRecord>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
  ) {}

  async findByUserId(userId: number, type?: string, reminderType?: string) {
    const where: any = { userId };
    if (type) where.type = type;
    if (reminderType) where.reminderType = reminderType;
    return this.repository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async getUnreadCount(userId: number) {
    return this.repository.count({ where: { userId, read: false } });
  }

  async getUnreadReminderCount(userId: number) {
    return this.repository.count({
      where: { userId, read: false, type: 'reminder' },
    });
  }

  async markAsRead(id: number) {
    await this.repository.update(id, { read: true });
    return { success: true };
  }

  async markAllAsRead(userId: number) {
    await this.repository.update({ userId, read: false }, { read: true });
    return { success: true };
  }

  async getTimeoutPendingApprovals(hours: number = 24) {
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - hours);

    const pendingRecords = await this.approvalRecordRepository.find({
      where: { status: 'pending' },
      relations: ['currentNode', 'approver', 'application', 'application.serviceItem', 'application.user'],
      order: { createdAt: 'ASC' },
    });

    return pendingRecords
      .filter(r => r.createdAt <= cutoffDate)
      .map(r => {
        const pendingMs = Date.now() - r.createdAt.getTime();
        const pendingH = Math.floor(pendingMs / (1000 * 60 * 60));
        return {
          recordId: r.id,
          applicationId: r.applicationId,
          applicationNo: r.application?.applicationNo,
          serviceItemName: r.application?.serviceItem?.name,
          applicantName: r.application?.user?.name,
          currentNodeName: r.currentNode?.nodeName,
          approverId: r.approverId,
          approverName: r.approver?.name,
          pendingHours: pendingH,
          createdAt: r.createdAt,
        };
      });
  }

  async sendTimeoutReminder(recordId: number, senderId: number) {
    const record = await this.approvalRecordRepository.findOne({
      where: { id: recordId },
      relations: ['currentNode', 'approver', 'application', 'application.serviceItem', 'application.user'],
    });
    if (!record) return { success: false, message: '审批记录不存在' };
    if (record.status !== 'pending') return { success: false, message: '该审批已处理' };

    const pendingMs = Date.now() - record.createdAt.getTime();
    const pendingH = Math.floor(pendingMs / (1000 * 60 * 60));

    if (!record.approverId) return { success: false, message: '无指定审批人' };

    const existing = await this.repository.findOne({
      where: {
        userId: record.approverId,
        type: 'reminder',
        reminderType: 'timeout',
        approvalRecordId: recordId,
      },
      order: { createdAt: 'DESC' },
    });

    if (existing) {
      const elapsed = Date.now() - existing.createdAt.getTime();
      if (elapsed < 4 * 60 * 60 * 1000) {
        return { success: false, message: '4小时内已发送过催办，请稍后再试' };
      }
    }

    const message = this.repository.create({
      userId: record.approverId,
      title: '超时待审催办提醒',
      content: `您有一个审批已超时${pendingH}小时未处理：${record.application?.serviceItem?.name}（编号：${record.application?.applicationNo}），审批节点：${record.currentNode?.nodeName}，申请人：${record.application?.user?.name}。请尽快处理。`,
      type: 'reminder',
      reminderType: 'timeout',
      applicationId: record.applicationId,
      approvalRecordId: recordId,
      pendingHours: pendingH,
    });
    await this.repository.save(message);

    return { success: true, message: '催办提醒已发送' };
  }

  async getAdminTodoAggregation() {
    const pendingApprovals = await this.approvalRecordRepository.count({
      where: { status: 'pending' },
    });

    const pendingWithdrawals = await this.withdrawalRepository.count({
      where: { status: 'pending' },
    });

    const pendingSupplements = await this.supplementRepository.count({
      where: { status: 'pending' },
    });

    const submittedApplications = await this.applicationRepository.count({
      where: { status: 'submitted' },
    });

    const reviewingApplications = await this.applicationRepository.count({
      where: { status: 'reviewing' },
    });

    const supplementingApplications = await this.applicationRepository.count({
      where: { status: 'supplementing' },
    });

    const timeoutPending = await this.getTimeoutPendingApprovals();

    const pendingByNode: Record<string, number> = {};
    const pendingRecords = await this.approvalRecordRepository.find({
      where: { status: 'pending' },
      relations: ['currentNode'],
    });
    for (const r of pendingRecords) {
      const nodeName = r.currentNode?.nodeName || '未知节点';
      pendingByNode[nodeName] = (pendingByNode[nodeName] || 0) + 1;
    }

    return {
      pendingApprovals,
      pendingWithdrawals,
      pendingSupplements,
      submittedApplications,
      reviewingApplications,
      supplementingApplications,
      timeoutPendingCount: timeoutPending.length,
      timeoutPendingItems: timeoutPending,
      pendingByNode,
      totalPending: pendingApprovals + pendingWithdrawals + pendingSupplements + submittedApplications + reviewingApplications + supplementingApplications,
    };
  }

  async sendStatusChangeNotification(
    userId: number,
    applicationId: number,
    oldStatus: string,
    newStatus: string,
    applicationNo: string,
    serviceItemName?: string,
    comment?: string,
  ) {
    const statusLabels: Record<string, string> = {
      pending: '草稿',
      submitted: '待审核',
      reviewing: '审核中',
      approved: '审核通过',
      rejected: '已驳回',
      completed: '办理完成',
      supplementing: '材料补充中',
      withdraw_pending: '撤回待审批',
      withdrawn: '已撤回',
    };

    const oldLabel = statusLabels[oldStatus] || oldStatus;
    const newLabel = statusLabels[newStatus] || newStatus;

    let content = `您的申请（编号：${applicationNo}）状态已从「${oldLabel}」变更为「${newLabel}」。`;
    if (serviceItemName) {
      content = `您的事项「${serviceItemName}」的申请（编号：${applicationNo}）状态已从「${oldLabel}」变更为「${newLabel}」。`;
    }
    if (comment) {
      content += ` 备注：${comment}`;
    }

    const urgentStatuses = ['rejected', 'supplementing', 'completed', 'approved'];
    const isUrgent = urgentStatuses.includes(newStatus);

    const message = this.repository.create({
      userId,
      title: `申请状态变更：${oldLabel} → ${newLabel}`,
      content,
      type: 'reminder',
      reminderType: 'status_change',
      applicationId,
      oldStatus,
      newStatus,
    });
    await this.repository.save(message);

    if (isUrgent) {
      const admins = await this.userRepository.find({ where: { role: 'admin' } });
      for (const admin of admins) {
        const adminMessage = this.repository.create({
          userId: admin.id,
          title: `用户申请状态变更通知`,
          content: `申请（编号：${applicationNo}）状态已从「${oldLabel}」变更为「${newLabel}」。${serviceItemName ? `事项：${serviceItemName}。` : ''}${comment ? `备注：${comment}` : ''}`,
          type: 'reminder',
          reminderType: 'status_change',
          applicationId,
          oldStatus,
          newStatus,
        });
        await this.repository.save(adminMessage);
      }
    }

    return { success: true };
  }
}
