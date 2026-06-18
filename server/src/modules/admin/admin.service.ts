import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Application } from '../../entities/application.entity';
import { ProgressRecord } from '../../entities/progress-record.entity';
import { Message } from '../../entities/message.entity';
import { ServiceItem } from '../../entities/service-item.entity';
import { User } from '../../entities/user.entity';
import { ApprovalRecord } from '../../entities/approval-record.entity';
import { CertificateService } from '../certificate/certificate.service';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Application) private readonly appRepository: Repository<Application>,
    @InjectRepository(ProgressRecord) private readonly progressRepository: Repository<ProgressRecord>,
    @InjectRepository(Message) private readonly messageRepository: Repository<Message>,
    @InjectRepository(ServiceItem) private readonly itemRepository: Repository<ServiceItem>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(ApprovalRecord) private readonly approvalRecordRepository: Repository<ApprovalRecord>,
    private readonly certificateService: CertificateService,
  ) {}

  async getStatistics() {
    const totalApplications = await this.appRepository.count();
    const pendingCount = await this.appRepository.count({ where: { status: 'submitted' } });
    const acceptedCount = await this.appRepository.count({ where: { status: 'accepted' } });
    const reviewingCount = await this.appRepository.count({ where: { status: 'reviewing' } });
    const approvedCount = await this.appRepository.count({ where: { status: 'approved' } });
    const rejectedCount = await this.appRepository.count({ where: { status: 'rejected' } });
    const completedCount = await this.appRepository.count({ where: { status: 'completed' } });
    const supplementingCount = await this.appRepository.count({ where: { status: 'supplementing' } });
    const userCount = await this.userRepository.count({ where: { role: 'user' } });
    const itemCount = await this.itemRepository.count({ where: { active: true } });

    return {
      totalApplications,
      pendingCount,
      acceptedCount,
      reviewingCount,
      approvedCount,
      rejectedCount,
      completedCount,
      supplementingCount,
      userCount,
      itemCount,
    };
  }

  async reviewApplication(
    id: number,
    action: 'accept' | 'approve' | 'reject' | 'reviewing' | 'complete',
    comment: string,
    reviewerId: number,
  ) {
    const app = await this.appRepository.findOne({ where: { id } });
    if (!app) throw new Error('申请不存在');

    const pendingApprovalRecord = await this.approvalRecordRepository.findOne({
      where: { applicationId: id, status: 'pending' },
      relations: ['approver', 'currentNode'],
    });

    if (pendingApprovalRecord) {
      if (pendingApprovalRecord.approverId && pendingApprovalRecord.approverId !== reviewerId) {
        const assignedName = pendingApprovalRecord.approver?.name || '其他人员';
        throw new ForbiddenException(
          `当前审批已指派给「${assignedName}」处理，您无权操作`,
        );
      }

      if (!pendingApprovalRecord.approverId) {
        const reviewer = await this.userRepository.findOne({ where: { id: reviewerId } });
        const requiredRole = pendingApprovalRecord.currentNode?.role;
        if (reviewer && requiredRole && reviewer.role !== requiredRole) {
          throw new ForbiddenException(
            `当前节点要求「${requiredRole}」角色审批，您的角色为「${reviewer.role}」，无权操作`,
          );
        }
      }
    }

    const statusMap: Record<string, string> = {
      accept: 'accepted',
      approve: 'approved',
      reject: 'rejected',
      reviewing: 'reviewing',
      complete: 'completed',
    };

    const stepMap: Record<string, string> = {
      accept: '受理申请',
      approve: '审核通过',
      reject: '审核驳回',
      reviewing: '材料审核',
      complete: '办结完成',
    };

    const progressStatusMap: Record<string, string> = {
      accept: 'completed',
      approve: 'completed',
      reject: 'failed',
      reviewing: 'processing',
      complete: 'completed',
    };

    const newStatus = statusMap[action];

    if (action === 'reviewing') {
      const hasAcceptRecord = await this.progressRepository.findOne({
        where: { applicationId: id, step: '受理申请' },
      });
      if (!hasAcceptRecord) {
        await this.progressRepository.save({
          applicationId: id,
          step: '受理申请',
          status: 'completed',
          remark: '系统自动受理',
          operatorId: reviewerId,
        });
      }
    }

    if (action === 'approve' || action === 'reject') {
      const hasReviewingRecord = await this.progressRepository.findOne({
        where: { applicationId: id, step: '材料审核' },
      });
      if (!hasReviewingRecord) {
        const hasAcceptRecord = await this.progressRepository.findOne({
          where: { applicationId: id, step: '受理申请' },
        });
        if (!hasAcceptRecord) {
          await this.progressRepository.save({
            applicationId: id,
            step: '受理申请',
            status: 'completed',
            remark: '系统自动受理',
            operatorId: reviewerId,
          });
        }
        await this.progressRepository.save({
          applicationId: id,
          step: '材料审核',
          status: 'completed',
          remark: '审核完成',
          operatorId: reviewerId,
        });
      }
    }

    if (action === 'complete') {
      const hasApproveRecord = await this.progressRepository.findOne({
        where: { applicationId: id, step: '审核通过' },
      });
      if (!hasApproveRecord) {
        const hasReviewingRecord = await this.progressRepository.findOne({
          where: { applicationId: id, step: '材料审核' },
        });
        if (!hasReviewingRecord) {
          const hasAcceptRecord = await this.progressRepository.findOne({
            where: { applicationId: id, step: '受理申请' },
          });
          if (!hasAcceptRecord) {
            await this.progressRepository.save({
              applicationId: id,
              step: '受理申请',
              status: 'completed',
              remark: '系统自动受理',
              operatorId: reviewerId,
            });
          }
          await this.progressRepository.save({
            applicationId: id,
            step: '材料审核',
            status: 'completed',
            remark: '审核完成',
            operatorId: reviewerId,
          });
        }
        await this.progressRepository.save({
          applicationId: id,
          step: '审核通过',
          status: 'completed',
          remark: '审核通过',
          operatorId: reviewerId,
        });
      }
    }

    app.status = newStatus;
    app.reviewComment = comment;
    app.reviewerId = reviewerId;
    await this.appRepository.save(app);

    await this.progressRepository.save({
      applicationId: id,
      step: stepMap[action],
      status: progressStatusMap[action],
      remark: comment,
      operatorId: reviewerId,
    });

    const titleMap: Record<string, string> = {
      accept: '申请已受理',
      approve: '申请审核通过',
      reject: '申请被驳回',
      reviewing: '申请进入审核阶段',
      complete: '申请已办理完成',
    };

    const contentMap: Record<string, string> = {
      accept: `您的申请（编号：${app.applicationNo}）已受理，我们将尽快为您审核。`,
      approve: `恭喜！您的申请（编号：${app.applicationNo}）已审核通过。${comment ? '审核意见：' + comment : ''}`,
      reject: `很遗憾，您的申请（编号：${app.applicationNo}）被驳回。${comment ? '驳回原因：' + comment : ''}您可在申请详情页选择"重新提交"。`,
      reviewing: `您的申请（编号：${app.applicationNo}）已进入审核阶段，请耐心等待结果。`,
      complete: `您的申请（编号：${app.applicationNo}）已办理完成，感谢您的使用。`,
    };

    await this.messageRepository.save({
      userId: app.userId,
      title: titleMap[action],
      content: contentMap[action] || `您的申请（编号：${app.applicationNo}）状态已更新。`,
      type: 'application',
      applicationId: id,
    });

    if (action === 'approve' || action === 'complete') {
      try {
        await this.certificateService.generateCertificate(id, reviewerId);
      } catch (e) {
        console.error('生成电子证明失败:', e);
      }
    }

    return app;
  }
}
