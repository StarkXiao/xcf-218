import { Injectable, NotFoundException, BadRequestException, UnauthorizedException, forwardRef, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { Application } from '../../entities/application.entity';
import { ProgressRecord } from '../../entities/progress-record.entity';
import { Message } from '../../entities/message.entity';
import { MaterialFile } from '../../entities/material-file.entity';
import { ServiceItem } from '../../entities/service-item.entity';
import { User } from '../../entities/user.entity';
import { WithdrawalRecord } from '../../entities/withdrawal-record.entity';
import { JointApplicationService } from '../joint-application/joint-application.service';
import { MaterialPreviewService, PreviewResult } from '../material-preview/material-preview.service';

interface MaterialInfo {
  name: string;
  required: boolean;
  fieldName: string;
}

interface CreateApplicationData {
  userId: number;
  serviceItemId: number;
  formData: any;
  materialsInfo: MaterialInfo[];
  files: Express.Multer.File[];
}

interface WithdrawData {
  applicationId: number;
  userId: number;
  reason: string;
}

interface ReviewWithdrawData {
  withdrawalId: number;
  reviewerId: number;
  status: 'approved' | 'rejected';
  comment?: string;
}

interface ResubmitData {
  originalApplicationId: number;
  userId: number;
  formData: any;
  materialsInfo: MaterialInfo[];
  files: Express.Multer.File[];
  retainedFileIds?: number[];
}

@Injectable()
export class ApplicationService {
  constructor(
    @InjectRepository(Application) private readonly appRepository: Repository<Application>,
    @InjectRepository(ProgressRecord) private readonly progressRepository: Repository<ProgressRecord>,
    @InjectRepository(Message) private readonly messageRepository: Repository<Message>,
    @InjectRepository(MaterialFile) private readonly fileRepository: Repository<MaterialFile>,
    @InjectRepository(ServiceItem) private readonly itemRepository: Repository<ServiceItem>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(WithdrawalRecord) private readonly withdrawalRepository: Repository<WithdrawalRecord>,
    @Inject(forwardRef(() => JointApplicationService))
    private readonly jointApplicationService: JointApplicationService,
    private readonly dataSource: DataSource,
    private readonly materialPreviewService: MaterialPreviewService,
  ) {}

  generateApplicationNo() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `BS${y}${m}${d}${rand}`;
  }

  async create(data: CreateApplicationData) {
    const item = await this.itemRepository.findOne({ where: { id: data.serviceItemId } });
    if (!item) {
      throw new NotFoundException('办事事项不存在');
    }
    const user = await this.userRepository.findOne({ where: { id: data.userId } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const previewResult = await this.validateMaterials(data.serviceItemId, undefined, data.formData, data.materialsInfo, data.files);
    if (!previewResult.passed) {
      await this.sendPreviewFailedMessage(data.userId, data.serviceItemId, previewResult, item.name);
      const errorMessages = previewResult.errors.map(e => e.message).join('；');
      throw new BadRequestException(`材料预审未通过：${errorMessages}`);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const applicationNo = this.generateApplicationNo();
      const application = this.appRepository.create({
        applicationNo,
        userId: data.userId,
        serviceItemId: data.serviceItemId,
        formData: JSON.stringify(data.formData),
        materials: JSON.stringify(data.materialsInfo),
        status: 'submitted',
      });

      const savedApp = await queryRunner.manager.save(application);

      for (const file of data.files) {
        const fieldName = file.fieldname;
        const materialInfo = data.materialsInfo.find(m => m.fieldName === fieldName);
        if (materialInfo) {
          const materialFile = this.fileRepository.create({
            applicationId: savedApp.id,
            fieldName,
            materialName: materialInfo.name,
            originalName: file.originalname,
            fileName: file.filename,
            filePath: file.path,
            fileSize: file.size,
            mimeType: file.mimetype,
            required: materialInfo.required,
            version: 1,
            isCurrent: true,
            status: 'normal',
            uploaderId: data.userId,
          });
          await queryRunner.manager.save(materialFile);
        }
      }

      await queryRunner.manager.save(ProgressRecord, {
        applicationId: savedApp.id,
        step: '提交申请',
        status: 'completed',
        remark: '用户已成功提交申请材料',
        operatorId: data.userId,
      });

      await this.sendApplicationMessage(
        savedApp.id,
        data.userId,
        '申请提交成功',
        `您的申请（编号：${applicationNo}）已成功提交，我们将尽快为您处理。事项：${item.name}`,
      );

      await queryRunner.manager.increment(ServiceItem, { id: data.serviceItemId }, 'applicationCount', 1);

      await queryRunner.commitTransaction();
      return this.findOne(savedApp.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async requestWithdraw(data: WithdrawData) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const app = await this.appRepository.findOne({
        where: { id: data.applicationId },
        relations: ['serviceItem', 'progressRecords', 'materialFiles'],
      });
      if (!app) {
        throw new NotFoundException('申请不存在');
      }

      if (app.userId !== data.userId) {
        throw new UnauthorizedException('无权操作此申请');
      }

      const ALLOWED_WITHDRAW_STATUSES = ['submitted', 'reviewing', 'supplementing'];
      if (!ALLOWED_WITHDRAW_STATUSES.includes(app.status)) {
        throw new BadRequestException(
          `当前状态（${this.getStatusLabel(app.status)}）不允许撤回申请。允许撤回的状态：待审核、审核中、材料补充中`,
        );
      }

      if (app.withdrawalCount >= 3) {
        throw new BadRequestException('申请撤回次数已达上限（最多3次），无法再次撤回');
      }

      const pendingWithdrawal = await this.withdrawalRepository.findOne({
        where: { applicationId: data.applicationId, status: 'pending' },
      });
      if (pendingWithdrawal) {
        throw new BadRequestException('该申请已有待审批的撤回请求，请等待审批结果');
      }

      const snapshot = JSON.stringify({
        formData: app.formData,
        materials: app.materials,
        materialFileIds: app.materialFiles.map(f => f.id),
        progressCount: app.progressRecords?.length || 0,
        statusAtWithdrawal: app.status,
      });

      const withdrawalRecord = this.withdrawalRepository.create({
        applicationId: data.applicationId,
        userId: data.userId,
        reason: data.reason,
        status: 'pending',
        snapshot,
      });

      const savedWithdrawal = await queryRunner.manager.save(withdrawalRecord);

      await queryRunner.manager.save(ProgressRecord, {
        applicationId: data.applicationId,
        step: '申请撤回',
        status: 'processing',
        remark: `用户申请撤回，原因：${data.reason}`,
        operatorId: data.userId,
      });

      await queryRunner.manager.update(Application, { id: data.applicationId }, {
        status: 'withdraw_pending',
      });

      await this.sendApplicationMessage(
        data.applicationId,
        data.userId,
        '撤回申请已提交',
        `您的申请（编号：${app.applicationNo}）撤回请求已提交，请等待管理员审批。撤回原因：${data.reason}`,
      );

      const admins = await this.userRepository.find({ where: { role: 'admin' } });
      for (const admin of admins) {
        await queryRunner.manager.save(Message, {
          userId: admin.id,
          title: '新的撤回申请待审批',
          content: `用户提交了撤回申请，申请编号：${app.applicationNo}，事项：${app.serviceItem?.name || '未知'}，撤回原因：${data.reason}`,
          type: 'system',
          applicationId: data.applicationId,
        });
      }

      await queryRunner.commitTransaction();
      return {
        success: true,
        withdrawalId: savedWithdrawal.id,
        message: '撤回申请已提交，等待管理员审批',
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async reviewWithdraw(data: ReviewWithdrawData) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const withdrawal = await this.withdrawalRepository.findOne({
        where: { id: data.withdrawalId },
        relations: ['application'],
      });
      if (!withdrawal) {
        throw new NotFoundException('撤回记录不存在');
      }

      if (withdrawal.status !== 'pending') {
        throw new BadRequestException('该撤回申请已处理，无需重复审批');
      }

      const app = withdrawal.application;
      const snapshot = withdrawal.snapshot ? JSON.parse(withdrawal.snapshot) : {};
      const originalStatus = snapshot.statusAtWithdrawal || 'submitted';

      if (data.status === 'approved') {
        await queryRunner.manager.update(Application, { id: app.id }, {
          status: 'withdrawn',
          withdrawalCount: () => 'withdrawalCount + 1',
          lastWithdrawnAt: new Date(),
        });

        await queryRunner.manager.save(ProgressRecord, {
          applicationId: app.id,
          step: '撤回通过',
          status: 'completed',
          remark: `管理员已批准撤回申请。${data.comment ? '审批意见：' + data.comment : ''}`,
          operatorId: data.reviewerId,
        });

        await this.sendApplicationMessage(
          app.id,
          withdrawal.userId,
          '撤回申请已批准',
          `您的申请（编号：${app.applicationNo}）已成功撤回。${data.comment ? '审批意见：' + data.comment : ''}如需重新办理，可在申请详情页点击"重新提交"。`,
        );

        withdrawal.status = 'approved';
      } else {
        await queryRunner.manager.update(Application, { id: app.id }, {
          status: originalStatus,
        });

        await queryRunner.manager.save(ProgressRecord, {
          applicationId: app.id,
          step: '撤回驳回',
          status: 'failed',
          remark: `管理员驳回了撤回申请。${data.comment ? '驳回原因：' + data.comment : ''}`,
          operatorId: data.reviewerId,
        });

        await this.sendApplicationMessage(
          app.id,
          withdrawal.userId,
          '撤回申请被驳回',
          `您的申请（编号：${app.applicationNo}）撤回请求被驳回。${data.comment ? '驳回原因：' + data.comment : '请继续按原流程办理。'}`,
        );

        withdrawal.status = 'rejected';
      }

      withdrawal.reviewerId = data.reviewerId;
      withdrawal.reviewComment = data.comment || '';
      withdrawal.reviewedAt = new Date();
      await queryRunner.manager.save(withdrawal);

      await queryRunner.commitTransaction();
      return {
        success: true,
        withdrawalId: withdrawal.id,
        status: data.status,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async resubmit(data: ResubmitData) {
    const originalApp = await this.appRepository.findOne({
      where: { id: data.originalApplicationId },
      relations: ['serviceItem', 'materialFiles', 'progressRecords'],
    });
    if (!originalApp) {
      throw new NotFoundException('原始申请不存在');
    }

    if (originalApp.userId !== data.userId) {
      throw new UnauthorizedException('无权操作此申请');
    }

    if (originalApp.status !== 'withdrawn' && originalApp.status !== 'rejected') {
      throw new BadRequestException(
        `当前状态（${this.getStatusLabel(originalApp.status)}）不允许重新提交。仅"已撤回"或"已驳回"的申请可重新提交`,
      );
    }

    if (originalApp.resubmitCount >= 3) {
      throw new BadRequestException('重新提交次数已达上限（最多3次），请发起新的申请');
    }

    const item = originalApp.serviceItem;
    const allFiles = [...data.files];
    if (data.retainedFileIds && data.retainedFileIds.length > 0) {
      const retainedFiles = originalApp.materialFiles.filter(f => data.retainedFileIds!.includes(f.id));
      for (const rf of retainedFiles) {
        allFiles.push({
          fieldname: rf.fieldName,
          originalname: rf.originalName,
          size: rf.fileSize,
          mimetype: rf.mimeType,
          filename: rf.fileName,
          path: rf.filePath,
        } as Express.Multer.File);
      }
    }

    const previewResult = await this.validateMaterials(
      data.originalApplicationId,
      undefined,
      data.formData,
      data.materialsInfo,
      allFiles,
    );
    if (!previewResult.passed) {
      await this.sendPreviewFailedMessage(data.userId, originalApp.serviceItemId, previewResult, item.name);
      const errorMessages = previewResult.errors.map(e => e.message).join('；');
      throw new BadRequestException(`材料预审未通过：${errorMessages}`);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const applicationNo = this.generateApplicationNo();

      const approvedWithdrawal = await this.withdrawalRepository.findOne({
        where: { applicationId: data.originalApplicationId, status: 'approved' },
        order: { createdAt: 'DESC' },
      });
      if (approvedWithdrawal) {
        approvedWithdrawal.resubmitCount = approvedWithdrawal.resubmitCount + 1;
        await queryRunner.manager.save(approvedWithdrawal);
      }

      const newApplication = this.appRepository.create({
        applicationNo,
        userId: data.userId,
        serviceItemId: originalApp.serviceItemId,
        formData: JSON.stringify(data.formData),
        materials: JSON.stringify(data.materialsInfo),
        status: 'submitted',
        originalApplicationId: data.originalApplicationId,
        isResubmit: true,
        resubmitCount: originalApp.resubmitCount + 1,
      });

      const savedApp = await queryRunner.manager.save(newApplication);

      const retainedFiles: MaterialFile[] = [];
      if (data.retainedFileIds && data.retainedFileIds.length > 0) {
        const originalFiles = await queryRunner.manager.find(MaterialFile, {
          where: { id: In(data.retainedFileIds), applicationId: data.originalApplicationId },
        });

        for (const origFile of originalFiles) {
          const retainedFile = queryRunner.manager.create(MaterialFile, {
            applicationId: savedApp.id,
            fieldName: origFile.fieldName,
            materialName: origFile.materialName,
            originalName: origFile.originalName,
            fileName: origFile.fileName,
            filePath: origFile.filePath,
            fileSize: origFile.fileSize,
            mimeType: origFile.mimeType,
            required: origFile.required,
            version: origFile.version + 1,
            isCurrent: true,
            status: 'reused',
            uploaderId: data.userId,
          });
          const saved = await queryRunner.manager.save(retainedFile);
          retainedFiles.push(saved);
        }
      }

      for (const file of data.files) {
        const fieldName = file.fieldname;
        const materialInfo = data.materialsInfo.find(m => m.fieldName === fieldName);
        if (materialInfo) {
          const materialFile = queryRunner.manager.create(MaterialFile, {
            applicationId: savedApp.id,
            fieldName,
            materialName: materialInfo.name,
            originalName: file.originalname,
            fileName: file.filename,
            filePath: file.path,
            fileSize: file.size,
            mimeType: file.mimetype,
            required: materialInfo.required,
            version: 1,
            isCurrent: true,
            status: 'new',
            uploaderId: data.userId,
          });
          await queryRunner.manager.save(materialFile);
        }
      }

      await queryRunner.manager.save(ProgressRecord, {
        applicationId: savedApp.id,
        step: '重新提交申请',
        status: 'completed',
        remark: `用户基于原申请（编号：${originalApp.applicationNo}）重新提交，复用过材料 ${retainedFiles.length} 份，新增材料 ${data.files.length} 份`,
        operatorId: data.userId,
      });

      await queryRunner.manager.save(ProgressRecord, {
        applicationId: savedApp.id,
        step: '提交申请',
        status: 'completed',
        remark: '重新提交的申请材料已成功提交',
        operatorId: data.userId,
      });

      if (originalApp.progressRecords && originalApp.progressRecords.length > 0) {
        const previousSteps = originalApp.progressRecords
          .filter(p => ['提交申请', '申请撤回', '撤回通过', '撤回驳回'].indexOf(p.step) === -1)
          .slice(0, 5);

        for (const prev of previousSteps) {
          await queryRunner.manager.save(ProgressRecord, {
            applicationId: savedApp.id,
            step: `历史进度：${prev.step}`,
            status: prev.status,
            remark: `历史进度补记（来自原申请${originalApp.applicationNo}）：${prev.remark || ''}`,
            operatorId: prev.operatorId,
          });
        }
      }

      await this.sendApplicationMessage(
        savedApp.id,
        data.userId,
        '重新提交成功',
        `您已基于原申请（编号：${originalApp.applicationNo}）重新提交申请，新编号：${applicationNo}。事项：${item.name}。本次复用材料 ${retainedFiles.length} 份，已为您补记历史办理进度。`,
      );

      await queryRunner.manager.increment(ServiceItem, { id: originalApp.serviceItemId }, 'applicationCount', 1);

      await queryRunner.commitTransaction();
      return this.findOne(savedApp.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getWithdrawalRecords(applicationId: number) {
    return this.withdrawalRepository.find({
      where: { applicationId },
      order: { createdAt: 'DESC' },
    });
  }

  async getWithdrawalDetail(withdrawalId: number) {
    const withdrawal = await this.withdrawalRepository.findOne({
      where: { id: withdrawalId },
      relations: ['application', 'user'],
    });
    if (!withdrawal) throw new NotFoundException('撤回记录不存在');
    return {
      ...withdrawal,
      snapshot: withdrawal.snapshot ? JSON.parse(withdrawal.snapshot) : null,
      user: withdrawal.user ? { ...withdrawal.user, password: undefined } : undefined,
    };
  }

  async listPendingWithdrawals() {
    return this.withdrawalRepository.find({
      where: { status: 'pending' },
      relations: ['application', 'application.serviceItem', 'user'],
      order: { createdAt: 'DESC' },
    });
  }

  async canWithdraw(applicationId: number, userId: number) {
    const app = await this.appRepository.findOne({ where: { id: applicationId } });
    if (!app) {
      return { canWithdraw: false, reason: '申请不存在' };
    }
    if (app.userId !== userId) {
      return { canWithdraw: false, reason: '无权操作此申请' };
    }
    const ALLOWED_STATUSES = ['submitted', 'reviewing', 'supplementing'];
    if (!ALLOWED_STATUSES.includes(app.status)) {
      return { canWithdraw: false, reason: `当前状态不允许撤回` };
    }
    if (app.withdrawalCount >= 3) {
      return { canWithdraw: false, reason: '撤回次数已达上限（3次）' };
    }
    const pendingWithdrawal = await this.withdrawalRepository.findOne({
      where: { applicationId, status: 'pending' },
    });
    if (pendingWithdrawal) {
      return { canWithdraw: false, reason: '已有待审批的撤回请求' };
    }
    return { canWithdraw: true, reason: '' };
  }

  async canResubmit(applicationId: number, userId: number) {
    const app = await this.appRepository.findOne({ where: { id: applicationId } });
    if (!app) {
      return { canResubmit: false, reason: '申请不存在' };
    }
    if (app.userId !== userId) {
      return { canResubmit: false, reason: '无权操作此申请' };
    }
    if (!['withdrawn', 'rejected'].includes(app.status)) {
      return { canResubmit: false, reason: '仅已撤回或已驳回的申请可重新提交' };
    }
    if (app.resubmitCount >= 3) {
      return { canResubmit: false, reason: '重新提交次数已达上限（3次）' };
    }
    return { canResubmit: true, reason: '' };
  }

  private async sendApplicationMessage(
    applicationId: number,
    userId: number,
    title: string,
    content: string,
  ) {
    await this.messageRepository.save({
      userId,
      title,
      content,
      type: 'application',
      applicationId,
    });
  }

  private getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
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
    return labels[status] || status;
  }

  async findByUserId(userId: number) {
    const apps = await this.appRepository.find({
      where: { userId },
      relations: ['serviceItem', 'materialFiles'],
      order: { createdAt: 'DESC' },
    });
    return apps.map(a => this.transformApplication(a));
  }

  async findAll(status?: string) {
    const where: any = {};
    if (status) where.status = status;
    const apps = await this.appRepository.find({
      where,
      relations: ['user', 'serviceItem', 'materialFiles'],
      order: { createdAt: 'DESC' },
    });
    return apps.map(a => this.transformApplication(a, true));
  }

  async findOne(id: number) {
    const app = await this.appRepository.findOne({
      where: { id },
      relations: ['serviceItem', 'user', 'progressRecords', 'materialFiles', 'withdrawalRecords'],
    });
    if (!app) throw new NotFoundException('申请不存在');
    return this.transformApplication(app, true);
  }

  private transformApplication(app: Application, includeUser = false) {
    const result: any = {
      ...app,
      formData: JSON.parse(app.formData),
      materials: app.materials ? JSON.parse(app.materials) : [],
      materialFiles: app.materialFiles || [],
      progressRecords: app.progressRecords || [],
      withdrawalRecords: app.withdrawalRecords || [],
      statusLabel: this.getStatusLabel(app.status),
    };
    if (includeUser && app.user) {
      result.user = { ...app.user, password: undefined };
    }
    return result;
  }

  async updateStatus(id: number, status: string, comment?: string, reviewerId?: number) {
    const app = await this.appRepository.findOne({ where: { id } });
    if (!app) throw new NotFoundException('申请不存在');

    const validStatuses = ['submitted', 'reviewing', 'approved', 'rejected', 'completed', 'supplementing'];
    if (!validStatuses.includes(status)) {
      throw new BadRequestException('无效的状态');
    }

    app.status = status;
    if (comment) app.reviewComment = comment;
    if (reviewerId) app.reviewerId = reviewerId;
    await this.appRepository.save(app);

    const stepMap: Record<string, string> = {
      reviewing: '材料审核',
      approved: '审核通过',
      rejected: '审核驳回',
      completed: '办理完成',
      supplementing: '材料退回',
    };

    if (stepMap[status]) {
      await this.progressRepository.save({
        applicationId: id,
        step: stepMap[status],
        status: status === 'rejected' ? 'failed' : 'completed',
        remark: comment || '',
        operatorId: reviewerId,
      });
    }

    const titleMap: Record<string, string> = {
      reviewing: '申请进入审核阶段',
      approved: '申请审核通过',
      rejected: '申请被驳回',
      completed: '申请已办理完成',
      supplementing: '申请材料需补充',
    };

    const contentMap: Record<string, string> = {
      reviewing: `您的申请（编号：${app.applicationNo}）已进入审核阶段，请耐心等待结果。`,
      approved: `恭喜！您的申请（编号：${app.applicationNo}）已审核通过。${comment ? '审核意见：' + comment : ''}`,
      rejected: `很遗憾，您的申请（编号：${app.applicationNo}）被驳回。${comment ? '驳回原因：' + comment : ''}您可在申请详情页选择"重新提交"。`,
      completed: `您的申请（编号：${app.applicationNo}）已办理完成，感谢您的使用。`,
      supplementing: `您的申请（编号：${app.applicationNo}）需要补充材料。${comment ? '补充说明：' + comment : ''}请及时补充后重新提交。`,
    };

    await this.messageRepository.save({
      userId: app.userId,
      title: titleMap[status] || '申请状态更新',
      content: contentMap[status] || `您的申请（编号：${app.applicationNo}）状态已更新为：${this.getStatusLabel(status)}`,
      type: 'application',
      applicationId: id,
    });

    try {
      await this.jointApplicationService.syncSubApplicationStatus(id);
    } catch (e) {
      // ignore
    }

    return this.findOne(id);
  }

  private async validateMaterials(
    serviceItemId: number,
    materialTemplateId: number | undefined,
    formData: any,
    materialsInfo: MaterialInfo[],
    files: Express.Multer.File[],
  ): Promise<PreviewResult> {
    const uploadedFiles = files.map(file => ({
      fieldName: file.fieldname,
      originalName: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
    }));

    return this.materialPreviewService.preview({
      serviceItemId,
      materialTemplateId,
      formData: formData || {},
      uploadedFiles,
      materialsInfo,
    });
  }

  private async sendPreviewFailedMessage(
    userId: number,
    serviceItemId: number,
    previewResult: PreviewResult,
    serviceItemName: string,
  ) {
    const missingList = previewResult.missingMaterials.map(m => `- ${m.fieldLabel}`).join('\n');
    const invalidList = previewResult.errors
      .filter(e => e.errorType !== 'missing')
      .map(e => `- ${e.fieldLabel}：${e.message}`)
      .join('\n');

    let content = `您提交的「${serviceItemName}」申请材料预审未通过。\n\n`;
    if (previewResult.missingMaterials.length > 0) {
      content += `缺少以下必需材料：\n${missingList}\n\n`;
    }
    if (previewResult.errors.filter(e => e.errorType !== 'missing').length > 0) {
      content += `以下材料不符合要求：\n${invalidList}\n\n`;
    }
    content += `请补充和修正后重新提交。`;

    await this.messageRepository.save({
      userId,
      title: '申请材料预审未通过',
      content,
      type: 'system',
      serviceItemId,
    });
  }

  async previewApplication(
    serviceItemId: number,
    materialTemplateId: number | undefined,
    formData: any,
    materialsInfo: MaterialInfo[],
    files: Express.Multer.File[],
  ): Promise<PreviewResult> {
    return this.validateMaterials(serviceItemId, materialTemplateId, formData, materialsInfo, files);
  }
}
