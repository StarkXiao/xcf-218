import { Injectable, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { CrossRegionApplication } from '../../entities/cross-region-application.entity';
import { CrossRegionDepartment } from '../../entities/cross-region-department.entity';
import { CrossRegionProgressShare } from '../../entities/cross-region-progress-share.entity';
import { CrossRegionMessageLog } from '../../entities/cross-region-message-log.entity';
import { Application } from '../../entities/application.entity';
import { ServiceItem } from '../../entities/service-item.entity';
import { User } from '../../entities/user.entity';
import { Message } from '../../entities/message.entity';
import { ProgressRecord } from '../../entities/progress-record.entity';
import { MaterialFile } from '../../entities/material-file.entity';

interface CreateCrossRegionData {
  userId: number;
  serviceItemId: number;
  localDepartmentId: number;
  remoteDepartmentId: number;
  applicantLocation: string;
  formData: any;
  materialsInfo: any[];
  files: Express.Multer.File[];
}

interface VerifyJurisdictionData {
  crossRegionApplicationId: number;
  verifierId: number;
  passed: boolean;
  reason?: string;
}

interface SwitchDepartmentData {
  crossRegionApplicationId: number;
  operatorId: number;
  targetHandler: 'local' | 'remote';
  reason: string;
}

interface UpdateCrossRegionStatusData {
  crossRegionApplicationId: number;
  status: string;
  comment?: string;
  operatorId?: number;
}

@Injectable()
export class CrossRegionService {
  constructor(
    @InjectRepository(CrossRegionApplication)
    private readonly crossRegionRepository: Repository<CrossRegionApplication>,
    @InjectRepository(CrossRegionDepartment)
    private readonly departmentRepository: Repository<CrossRegionDepartment>,
    @InjectRepository(CrossRegionProgressShare)
    private readonly progressShareRepository: Repository<CrossRegionProgressShare>,
    @InjectRepository(CrossRegionMessageLog)
    private readonly messageLogRepository: Repository<CrossRegionMessageLog>,
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
    @InjectRepository(ServiceItem)
    private readonly serviceItemRepository: Repository<ServiceItem>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(ProgressRecord)
    private readonly progressRepository: Repository<ProgressRecord>,
    @InjectRepository(MaterialFile)
    private readonly materialFileRepository: Repository<MaterialFile>,
    private readonly dataSource: DataSource,
  ) {}

  private generateCrossRegionNo(): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `YD${y}${m}${d}${rand}`;
  }

  private generateApplicationNo(): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `BS${y}${m}${d}${rand}`;
  }

  async getDepartments() {
    return this.departmentRepository.find({
      where: { active: true },
      order: { region: 'ASC', name: 'ASC' },
    });
  }

  async checkJurisdiction(serviceItemId: number, applicantLocation: string) {
    const item = await this.serviceItemRepository.findOne({ where: { id: serviceItemId } });
    if (!item) throw new NotFoundException('事项不存在');

    const allDepartments = await this.departmentRepository.find({ where: { active: true } });

    const itemCode = item.code;
    const matchingDepartments = allDepartments.filter(dept => {
      if (!dept.supportedServiceCodes) return false;
      const codes = dept.supportedServiceCodes.split(',');
      return codes.some(c => c.trim() === itemCode || itemCode.startsWith(c.trim()));
    });

    const localDepartments = matchingDepartments.filter(d =>
      d.region === applicantLocation
    );
    const remoteDepartments = matchingDepartments.filter(d =>
      d.region !== applicantLocation
    );

    const isLocalAvailable = localDepartments.length > 0;
    const isRemoteAvailable = remoteDepartments.length > 0;
    const needsCrossRegion = !isLocalAvailable && isRemoteAvailable;

    return {
      serviceItemId,
      serviceItemName: item.name,
      applicantLocation,
      isLocalAvailable,
      isRemoteAvailable,
      needsCrossRegion,
      localDepartments: localDepartments.map(d => ({ id: d.id, name: d.name, region: d.region })),
      remoteDepartments: remoteDepartments.map(d => ({ id: d.id, name: d.name, region: d.region })),
    };
  }

  async create(data: CreateCrossRegionData) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = await this.userRepository.findOne({ where: { id: data.userId } });
      if (!user) throw new NotFoundException('用户不存在');

      const item = await this.serviceItemRepository.findOne({ where: { id: data.serviceItemId } });
      if (!item) throw new NotFoundException('事项不存在');

      const localDept = await this.departmentRepository.findOne({ where: { id: data.localDepartmentId } });
      if (!localDept) throw new NotFoundException('属地部门不存在');

      const remoteDept = await this.departmentRepository.findOne({ where: { id: data.remoteDepartmentId } });
      if (!remoteDept) throw new NotFoundException('异地受理部门不存在');

      if (localDept.id === remoteDept.id) {
        throw new BadRequestException('属地部门与异地受理部门不能相同');
      }

      const crossRegionNo = this.generateCrossRegionNo();

      const jurisdictionResult = await this.checkJurisdiction(data.serviceItemId, data.applicantLocation);

      const application = this.applicationRepository.create({
        applicationNo: this.generateApplicationNo(),
        userId: data.userId,
        serviceItemId: data.serviceItemId,
        formData: JSON.stringify(data.formData),
        materials: JSON.stringify(data.materialsInfo),
        status: 'submitted',
      });
      const savedApp = await queryRunner.manager.save(application);

      for (const file of data.files) {
        const fieldName = file.fieldname;
        const materialInfo = data.materialsInfo.find((m: any) => m.fieldName === fieldName);
        if (materialInfo) {
          const materialFile = this.materialFileRepository.create({
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

      const crossRegionApp = this.crossRegionRepository.create({
        crossRegionNo,
        userId: data.userId,
        serviceItemId: data.serviceItemId,
        applicationId: savedApp.id,
        localDepartmentId: data.localDepartmentId,
        remoteDepartmentId: data.remoteDepartmentId,
        currentHandler: 'local',
        status: 'pending_verify',
        formData: JSON.stringify(data.formData),
        materials: JSON.stringify(data.materialsInfo),
        applicantLocation: data.applicantLocation,
        jurisdictionVerifyStatus: 'pending',
        jurisdictionVerifyResult: JSON.stringify({
          needsCrossRegion: jurisdictionResult.needsCrossRegion,
          applicantLocation: data.applicantLocation,
          localDept: localDept.name,
          remoteDept: remoteDept.name,
          checkTime: new Date().toISOString(),
        }),
        departmentSwitchCount: 0,
        progressShared: false,
      });

      const savedCrossRegion = await queryRunner.manager.save(crossRegionApp);

      await queryRunner.manager.save(ProgressRecord, {
        applicationId: savedApp.id,
        step: '异地办理申请提交',
        status: 'completed',
        remark: `用户提交异地办理申请，属地：${localDept.name}，异地受理：${remoteDept.name}`,
        operatorId: data.userId,
      });

      await queryRunner.manager.save(CrossRegionProgressShare, {
        crossRegionApplicationId: savedCrossRegion.id,
        step: '申请提交',
        status: 'completed',
        remark: `用户在${localDept.region}提交异地办理申请，目标受理部门：${remoteDept.name}（${remoteDept.region}）`,
        operatorId: data.userId,
        fromDepartmentId: data.localDepartmentId,
        toDepartmentId: data.remoteDepartmentId,
        visibleToApplicant: true,
        visibleToLocal: true,
        visibleToRemote: true,
      });

      await this.sendRoleBasedMessages(
        queryRunner,
        savedCrossRegion.id,
        data.userId,
        localDept,
        remoteDept,
        'created',
        { crossRegionNo, itemName: item.name },
      );

      await queryRunner.manager.increment(ServiceItem, { id: data.serviceItemId }, 'applicationCount', 1);

      await queryRunner.commitTransaction();
      return this.findOne(savedCrossRegion.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async verifyJurisdiction(data: VerifyJurisdictionData) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const crossApp = await this.crossRegionRepository.findOne({
        where: { id: data.crossRegionApplicationId },
        relations: ['serviceItem', 'localDepartment', 'remoteDepartment'],
      });
      if (!crossApp) throw new NotFoundException('异地办理申请不存在');

      if (crossApp.status !== 'pending_verify') {
        throw new BadRequestException('当前状态不允许属地校验');
      }

      const verifier = await this.userRepository.findOne({ where: { id: data.verifierId } });
      if (!verifier || verifier.role !== 'admin') {
        throw new UnauthorizedException('仅管理员可进行属地校验');
      }

      crossApp.jurisdictionVerifyStatus = data.passed ? 'passed' : 'failed';
      crossApp.jurisdictionVerifyResult = JSON.stringify({
        ...JSON.parse(crossApp.jurisdictionVerifyResult || '{}'),
        verifyResult: data.passed ? 'passed' : 'failed',
        verifyReason: data.reason || '',
        verifierName: verifier.name,
        verifiedAt: new Date().toISOString(),
      });
      crossApp.verifiedAt = new Date();
      crossApp.verifiedBy = data.verifierId;

      if (data.passed) {
        crossApp.status = 'pending_accept';
      } else {
        crossApp.status = 'verify_failed';
      }

      await queryRunner.manager.save(crossApp);

      await queryRunner.manager.save(CrossRegionProgressShare, {
        crossRegionApplicationId: crossApp.id,
        step: '属地校验',
        status: data.passed ? 'completed' : 'failed',
        remark: data.passed
          ? `属地校验通过，${crossApp.localDepartment.name}确认为属地部门，将转交${crossApp.remoteDepartment.name}受理`
          : `属地校验未通过：${data.reason || '不符合异地办理条件'}`,
        operatorId: data.verifierId,
        fromDepartmentId: crossApp.localDepartmentId,
        toDepartmentId: crossApp.remoteDepartmentId,
        visibleToApplicant: true,
        visibleToLocal: true,
        visibleToRemote: true,
      });

      if (crossApp.applicationId) {
        await queryRunner.manager.save(ProgressRecord, {
          applicationId: crossApp.applicationId,
          step: '属地校验',
          status: data.passed ? 'completed' : 'failed',
          remark: data.passed
            ? '属地校验通过，进入异地受理阶段'
            : `属地校验未通过：${data.reason || '不符合异地办理条件'}`,
          operatorId: data.verifierId,
        });
      }

      await this.sendRoleBasedMessages(
        queryRunner,
        crossApp.id,
        crossApp.userId,
        crossApp.localDepartment,
        crossApp.remoteDepartment,
        data.passed ? 'verify_passed' : 'verify_failed',
        { crossRegionNo: crossApp.crossRegionNo, itemName: crossApp.serviceItem?.name, reason: data.reason },
      );

      await queryRunner.commitTransaction();
      return this.findOne(crossApp.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async switchDepartment(data: SwitchDepartmentData) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const crossApp = await this.crossRegionRepository.findOne({
        where: { id: data.crossRegionApplicationId },
        relations: ['serviceItem', 'localDepartment', 'remoteDepartment'],
      });
      if (!crossApp) throw new NotFoundException('异地办理申请不存在');

      if (!['pending_accept', 'processing_local', 'processing_remote'].includes(crossApp.status)) {
        throw new BadRequestException('当前状态不允许切换受理部门');
      }

      if (crossApp.currentHandler === data.targetHandler) {
        throw new BadRequestException(`当前已由${data.targetHandler === 'local' ? '属地' : '异地'}部门处理`);
      }

      const switchLog = crossApp.departmentSwitchLog ? JSON.parse(crossApp.departmentSwitchLog) : [];
      switchLog.push({
        from: crossApp.currentHandler,
        to: data.targetHandler,
        operatorId: data.operatorId,
        reason: data.reason,
        switchedAt: new Date().toISOString(),
      });

      crossApp.currentHandler = data.targetHandler;
      crossApp.departmentSwitchCount = (crossApp.departmentSwitchCount || 0) + 1;
      crossApp.departmentSwitchLog = JSON.stringify(switchLog);

      if (data.targetHandler === 'local') {
        crossApp.status = 'processing_local';
        crossApp.localReviewerId = data.operatorId;
      } else {
        crossApp.status = 'processing_remote';
        crossApp.remoteReviewerId = data.operatorId;
      }

      await queryRunner.manager.save(crossApp);

      const fromDept = data.targetHandler === 'local' ? crossApp.remoteDepartment : crossApp.localDepartment;
      const toDept = data.targetHandler === 'local' ? crossApp.localDepartment : crossApp.remoteDepartment;

      await queryRunner.manager.save(CrossRegionProgressShare, {
        crossRegionApplicationId: crossApp.id,
        step: '受理部门切换',
        status: 'completed',
        remark: `受理部门从${fromDept.name}切换至${toDept.name}，原因：${data.reason}`,
        operatorId: data.operatorId,
        fromDepartmentId: fromDept.id,
        toDepartmentId: toDept.id,
        visibleToApplicant: true,
        visibleToLocal: true,
        visibleToRemote: true,
      });

      if (crossApp.applicationId) {
        await queryRunner.manager.save(ProgressRecord, {
          applicationId: crossApp.applicationId,
          step: '受理部门切换',
          status: 'completed',
          remark: `受理部门从${fromDept.name}切换至${toDept.name}，原因：${data.reason}`,
          operatorId: data.operatorId,
        });
      }

      await this.sendRoleBasedMessages(
        queryRunner,
        crossApp.id,
        crossApp.userId,
        crossApp.localDepartment,
        crossApp.remoteDepartment,
        'department_switched',
        {
          crossRegionNo: crossApp.crossRegionNo,
          itemName: crossApp.serviceItem?.name,
          fromDeptName: fromDept.name,
          toDeptName: toDept.name,
          reason: data.reason,
        },
      );

      await queryRunner.commitTransaction();
      return this.findOne(crossApp.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async updateStatus(data: UpdateCrossRegionStatusData) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const crossApp = await this.crossRegionRepository.findOne({
        where: { id: data.crossRegionApplicationId },
        relations: ['serviceItem', 'localDepartment', 'remoteDepartment'],
      });
      if (!crossApp) throw new NotFoundException('异地办理申请不存在');

      const validStatuses = ['pending_verify', 'pending_accept', 'processing_local', 'processing_remote', 'approved', 'rejected', 'completed', 'verify_failed'];
      if (!validStatuses.includes(data.status)) {
        throw new BadRequestException('无效的状态');
      }

      const oldStatus = crossApp.status;
      crossApp.status = data.status;
      if (data.comment) crossApp.reviewComment = data.comment;

      if (data.status === 'approved' || data.status === 'completed') {
        if (data.operatorId) {
          if (crossApp.currentHandler === 'local') {
            crossApp.localReviewerId = data.operatorId;
          } else {
            crossApp.remoteReviewerId = data.operatorId;
          }
        }
      }

      if (data.status === 'completed') {
        crossApp.completedAt = new Date();
        crossApp.progressShared = true;
      }

      if (data.status === 'approved') {
        crossApp.progressShared = true;
      }

      await queryRunner.manager.save(crossApp);

      if (crossApp.applicationId) {
        if (data.status === 'processing_local' || data.status === 'processing_remote') {
          const app = await this.applicationRepository.findOne({ where: { id: crossApp.applicationId } });
          if (app && app.status === 'submitted') {
            await queryRunner.manager.update(Application, { id: crossApp.applicationId }, { status: 'reviewing' });
            await queryRunner.manager.save(ProgressRecord, {
              applicationId: crossApp.applicationId,
              step: '异地受理审核',
              status: 'completed',
              remark: `异地办理申请进入审核阶段，由${crossApp.currentHandler === 'local' ? '属地' : '异地'}部门处理`,
              operatorId: data.operatorId,
            });
          }
        }

        if (data.status === 'completed') {
          await queryRunner.manager.update(Application, { id: crossApp.applicationId }, { status: 'completed', reviewComment: data.comment || '异地办理完成' });
          await queryRunner.manager.save(ProgressRecord, {
            applicationId: crossApp.applicationId,
            step: '异地办理完成',
            status: 'completed',
            remark: data.comment || '异地办理已完成',
            operatorId: data.operatorId,
          });
        }

        if (data.status === 'rejected') {
          await queryRunner.manager.update(Application, { id: crossApp.applicationId }, { status: 'rejected', reviewComment: data.comment || '' });
          await queryRunner.manager.save(ProgressRecord, {
            applicationId: crossApp.applicationId,
            step: '异地办理驳回',
            status: 'failed',
            remark: data.comment || '',
            operatorId: data.operatorId,
          });
        }
      }

      const statusStepMap: Record<string, string> = {
        pending_accept: '等待异地受理',
        processing_local: '属地部门审核中',
        processing_remote: '异地部门审核中',
        approved: '审核通过',
        rejected: '审核驳回',
        completed: '办理完成',
      };

      if (statusStepMap[data.status]) {
        await queryRunner.manager.save(CrossRegionProgressShare, {
          crossRegionApplicationId: crossApp.id,
          step: statusStepMap[data.status],
          status: ['rejected'].includes(data.status) ? 'failed' : 'completed',
          remark: data.comment || '',
          operatorId: data.operatorId,
          fromDepartmentId: crossApp.currentHandler === 'local' ? crossApp.localDepartmentId : crossApp.remoteDepartmentId,
          toDepartmentId: crossApp.currentHandler === 'local' ? crossApp.remoteDepartmentId : crossApp.localDepartmentId,
          visibleToApplicant: true,
          visibleToLocal: true,
          visibleToRemote: true,
        });
      }

      const messageEventMap: Record<string, string> = {
        processing_local: 'processing',
        processing_remote: 'processing',
        approved: 'approved',
        rejected: 'rejected',
        completed: 'completed',
      };

      if (messageEventMap[data.status]) {
        await this.sendRoleBasedMessages(
          queryRunner,
          crossApp.id,
          crossApp.userId,
          crossApp.localDepartment,
          crossApp.remoteDepartment,
          messageEventMap[data.status],
          { crossRegionNo: crossApp.crossRegionNo, itemName: crossApp.serviceItem?.name, comment: data.comment },
        );
      }

      await queryRunner.commitTransaction();
      return this.findOne(crossApp.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getProgressShares(crossRegionApplicationId: number, viewerRole: string) {
    const shares = await this.progressShareRepository.find({
      where: { crossRegionApplicationId },
      relations: ['operator', 'fromDepartment', 'toDepartment'],
      order: { createdAt: 'ASC' },
    });

    return shares.filter(share => {
      if (viewerRole === 'applicant') return share.visibleToApplicant;
      if (viewerRole === 'local') return share.visibleToLocal;
      if (viewerRole === 'remote') return share.visibleToRemote;
      return true;
    }).map(share => ({
      ...share,
      operator: share.operator ? { ...share.operator, password: undefined } : undefined,
    }));
  }

  async getMessageLogs(crossRegionApplicationId: number) {
    const logs = await this.messageLogRepository.find({
      where: { crossRegionApplicationId },
      relations: ['targetUser', 'targetDepartment'],
      order: { createdAt: 'DESC' },
    });

    return logs.map(log => ({
      ...log,
      targetUser: log.targetUser ? { ...log.targetUser, password: undefined } : undefined,
    }));
  }

  async findByUserId(userId: number) {
    const apps = await this.crossRegionRepository.find({
      where: { userId },
      relations: ['serviceItem', 'localDepartment', 'remoteDepartment', 'application'],
      order: { createdAt: 'DESC' },
    });
    return apps.map(a => this.transformCrossRegionApp(a));
  }

  async findAll(params?: { status?: string; currentHandler?: string }) {
    const where: any = {};
    if (params?.status) where.status = params.status;
    if (params?.currentHandler) where.currentHandler = params.currentHandler;

    const apps = await this.crossRegionRepository.find({
      where,
      relations: ['user', 'serviceItem', 'localDepartment', 'remoteDepartment', 'application'],
      order: { createdAt: 'DESC' },
    });
    return apps.map(a => this.transformCrossRegionApp(a, true));
  }

  async findOne(id: number) {
    const app = await this.crossRegionRepository.findOne({
      where: { id },
      relations: ['user', 'serviceItem', 'localDepartment', 'remoteDepartment', 'application', 'verifier', 'localReviewer', 'remoteReviewer'],
    });
    if (!app) throw new NotFoundException('异地办理申请不存在');
    return this.transformCrossRegionApp(app, true);
  }

  async getStatistics() {
    const all = await this.crossRegionRepository.find();

    const stats = {
      total: all.length,
      pendingVerify: all.filter(a => a.status === 'pending_verify').length,
      pendingAccept: all.filter(a => a.status === 'pending_accept').length,
      processingLocal: all.filter(a => a.status === 'processing_local').length,
      processingRemote: all.filter(a => a.status === 'processing_remote').length,
      approved: all.filter(a => a.status === 'approved').length,
      rejected: all.filter(a => a.status === 'rejected').length,
      completed: all.filter(a => a.status === 'completed').length,
      verifyFailed: all.filter(a => a.status === 'verify_failed').length,
      byLocalDept: {} as Record<string, number>,
      byRemoteDept: {} as Record<string, number>,
      switchCount: all.reduce((sum, a) => sum + (a.departmentSwitchCount || 0), 0),
    };

    return stats;
  }

  private async sendRoleBasedMessages(
    queryRunner: any,
    crossRegionApplicationId: number,
    userId: number,
    localDept: CrossRegionDepartment,
    remoteDept: CrossRegionDepartment,
    event: string,
    params: any,
  ) {
    const messageTemplates: Record<string, Record<string, { title: string; content: string }>> = {
      created: {
        applicant: {
          title: '异地办理申请已提交',
          content: `您的异地办理申请（编号：${params.crossRegionNo}）已提交，事项：${params.itemName}。属地：${localDept.name}，异地受理：${remoteDept.name}。请等待属地校验。`,
        },
        local_admin: {
          title: '新的异地办理申请待校验',
          content: `用户提交了异地办理申请（编号：${params.crossRegionNo}），事项：${params.itemName}。请尽快进行属地校验。`,
        },
        remote_admin: {
          title: '收到异地办理待受理通知',
          content: `收到来自${localDept.name}的异地办理申请（编号：${params.crossRegionNo}），事项：${params.itemName}。请等待属地校验通过后受理。`,
        },
      },
      verify_passed: {
        applicant: {
          title: '属地校验通过',
          content: `您的异地办理申请（编号：${params.crossRegionNo}）属地校验已通过，即将转交${remoteDept.name}受理。`,
        },
        local_admin: {
          title: '异地办理校验已通过',
          content: `异地办理申请（编号：${params.crossRegionNo}）属地校验已通过，已转交${remoteDept.name}受理。`,
        },
        remote_admin: {
          title: '异地办理申请待受理',
          content: `异地办理申请（编号：${params.crossRegionNo}）属地校验已通过，请尽快受理。事项：${params.itemName}。`,
        },
      },
      verify_failed: {
        applicant: {
          title: '属地校验未通过',
          content: `您的异地办理申请（编号：${params.crossRegionNo}）属地校验未通过。${params.reason ? '原因：' + params.reason : ''}`,
        },
        local_admin: {
          title: '异地办理校验未通过',
          content: `异地办理申请（编号：${params.crossRegionNo}）属地校验未通过。${params.reason ? '原因：' + params.reason : ''}`,
        },
        remote_admin: {
          title: '异地办理申请校验未通过',
          content: `异地办理申请（编号：${params.crossRegionNo}）属地校验未通过，无需受理。`,
        },
      },
      department_switched: {
        applicant: {
          title: '受理部门已切换',
          content: `您的异地办理申请（编号：${params.crossRegionNo}）受理部门已从${params.fromDeptName}切换至${params.toDeptName}。原因：${params.reason}`,
        },
        local_admin: {
          title: '异地办理受理部门切换',
          content: `异地办理申请（编号：${params.crossRegionNo}）受理部门已从${params.fromDeptName}切换至${params.toDeptName}。原因：${params.reason}`,
        },
        remote_admin: {
          title: '异地办理受理部门切换',
          content: `异地办理申请（编号：${params.crossRegionNo}）受理部门已从${params.fromDeptName}切换至${params.toDeptName}。原因：${params.reason}`,
        },
      },
      processing: {
        applicant: {
          title: '异地办理审核中',
          content: `您的异地办理申请（编号：${params.crossRegionNo}）正在审核中。事项：${params.itemName}`,
        },
        local_admin: {
          title: '异地办理申请审核中',
          content: `异地办理申请（编号：${params.crossRegionNo}）正在审核中。`,
        },
        remote_admin: {
          title: '异地办理申请审核中',
          content: `异地办理申请（编号：${params.crossRegionNo}）正在审核中。`,
        },
      },
      approved: {
        applicant: {
          title: '异地办理审核通过',
          content: `您的异地办理申请（编号：${params.crossRegionNo}）已审核通过！${params.comment ? '审核意见：' + params.comment : ''}`,
        },
        local_admin: {
          title: '异地办理审核通过',
          content: `异地办理申请（编号：${params.crossRegionNo}）已审核通过。`,
        },
        remote_admin: {
          title: '异地办理审核通过',
          content: `异地办理申请（编号：${params.crossRegionNo}）已审核通过。`,
        },
      },
      rejected: {
        applicant: {
          title: '异地办理被驳回',
          content: `您的异地办理申请（编号：${params.crossRegionNo}）被驳回。${params.comment ? '驳回原因：' + params.comment : ''}`,
        },
        local_admin: {
          title: '异地办理被驳回',
          content: `异地办理申请（编号：${params.crossRegionNo}）被驳回。`,
        },
        remote_admin: {
          title: '异地办理被驳回',
          content: `异地办理申请（编号：${params.crossRegionNo}）被驳回。`,
        },
      },
      completed: {
        applicant: {
          title: '异地办理已完成',
          content: `您的异地办理申请（编号：${params.crossRegionNo}）已办理完成！${params.comment ? '备注：' + params.comment : ''}`,
        },
        local_admin: {
          title: '异地办理已完成',
          content: `异地办理申请（编号：${params.crossRegionNo}）已办理完成。`,
        },
        remote_admin: {
          title: '异地办理已完成',
          content: `异地办理申请（编号：${params.crossRegionNo}）已办理完成。`,
        },
      },
    };

    const templates = messageTemplates[event];
    if (!templates) return;

    const roles = ['applicant', 'local_admin', 'remote_admin'];

    const allAdmins = await this.userRepository.find({ where: { role: 'admin' } });
    const localAdmins = allAdmins.filter(u => u.departmentCode === localDept.code);
    const remoteAdmins = allAdmins.filter(u => u.departmentCode === remoteDept.code);
    const unassignedAdmins = allAdmins.filter(u => !u.departmentCode);

    for (const role of roles) {
      const template = templates[role];
      if (!template) continue;

      if (role === 'applicant') {
        await queryRunner.manager.save(Message, {
          userId,
          title: template.title,
          content: template.content,
          type: 'cross_region',
          applicationId: null,
        });

        await queryRunner.manager.save(CrossRegionMessageLog, {
          crossRegionApplicationId,
          targetRole: role,
          targetUserId: userId,
          targetDepartmentId: null,
          title: template.title,
          content: template.content,
          messageType: event,
          sent: true,
          sentAt: new Date(),
        });
      } else if (role === 'local_admin') {
        const targets = localAdmins.length > 0 ? localAdmins : unassignedAdmins;
        for (const admin of targets) {
          await queryRunner.manager.save(Message, {
            userId: admin.id,
            title: template.title,
            content: template.content,
            type: 'cross_region',
          });

          await queryRunner.manager.save(CrossRegionMessageLog, {
            crossRegionApplicationId,
            targetRole: role,
            targetUserId: admin.id,
            targetDepartmentId: localDept.id,
            title: template.title,
            content: template.content,
            messageType: event,
            sent: true,
            sentAt: new Date(),
          });
        }
      } else if (role === 'remote_admin') {
        const targets = remoteAdmins.length > 0 ? remoteAdmins : unassignedAdmins;
        for (const admin of targets) {
          await queryRunner.manager.save(Message, {
            userId: admin.id,
            title: template.title,
            content: template.content,
            type: 'cross_region',
          });

          await queryRunner.manager.save(CrossRegionMessageLog, {
            crossRegionApplicationId,
            targetRole: role,
            targetUserId: admin.id,
            targetDepartmentId: remoteDept.id,
            title: template.title,
            content: template.content,
            messageType: event,
            sent: true,
            sentAt: new Date(),
          });
        }
      }
    }
  }

  private transformCrossRegionApp(app: CrossRegionApplication, includeUser = false) {
    const result: any = {
      ...app,
      formData: typeof app.formData === 'string' ? JSON.parse(app.formData) : app.formData,
      materials: app.materials ? (typeof app.materials === 'string' ? JSON.parse(app.materials) : app.materials) : [],
      jurisdictionVerifyResult: app.jurisdictionVerifyResult
        ? (typeof app.jurisdictionVerifyResult === 'string' ? JSON.parse(app.jurisdictionVerifyResult) : app.jurisdictionVerifyResult)
        : null,
      departmentSwitchLog: app.departmentSwitchLog
        ? (typeof app.departmentSwitchLog === 'string' ? JSON.parse(app.departmentSwitchLog) : app.departmentSwitchLog)
        : [],
      statusLabel: this.getStatusLabel(app.status),
      currentHandlerLabel: app.currentHandler === 'local' ? '属地部门' : '异地部门',
    };

    if (includeUser && app.user) {
      result.user = { ...app.user, password: undefined };
    }
    if (app.verifier) {
      result.verifier = { ...app.verifier, password: undefined };
    }
    if (app.localReviewer) {
      result.localReviewer = { ...app.localReviewer, password: undefined };
    }
    if (app.remoteReviewer) {
      result.remoteReviewer = { ...app.remoteReviewer, password: undefined };
    }

    return result;
  }

  private getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending_verify: '待属地校验',
      pending_accept: '待异地受理',
      processing_local: '属地审核中',
      processing_remote: '异地审核中',
      approved: '审核通过',
      rejected: '已驳回',
      completed: '办理完成',
      verify_failed: '校验未通过',
    };
    return labels[status] || status;
  }
}
