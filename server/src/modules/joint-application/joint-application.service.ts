import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { JointApplication } from '../../entities/joint-application.entity';
import { JointSubApplication } from '../../entities/joint-sub-application.entity';
import { JointMaterialRelation } from '../../entities/joint-material-relation.entity';
import { Application } from '../../entities/application.entity';
import { ServiceItem } from '../../entities/service-item.entity';
import { MaterialFile } from '../../entities/material-file.entity';
import { User } from '../../entities/user.entity';
import { Message } from '../../entities/message.entity';
import { ProgressRecord } from '../../entities/progress-record.entity';

export interface MaterialInfo {
  name: string;
  required: boolean;
  fieldName: string;
  isShared?: boolean;
  serviceItemIds?: number[];
}

export interface SubApplicationData {
  serviceItemId: number;
  formData: any;
  materialsInfo: MaterialInfo[];
  sortOrder?: number;
}

export interface CreateJointApplicationData {
  userId: number;
  title: string;
  formData: any;
  subApplications: SubApplicationData[];
  files: Array<{
    fieldName: string;
    file: Express.Multer.File;
  }>;
}

@Injectable()
export class JointApplicationService {
  private readonly logger = new Logger(JointApplicationService.name);

  constructor(
    @InjectRepository(JointApplication)
    private readonly jointAppRepository: Repository<JointApplication>,
    @InjectRepository(JointSubApplication)
    private readonly subAppRepository: Repository<JointSubApplication>,
    @InjectRepository(JointMaterialRelation)
    private readonly materialRelationRepository: Repository<JointMaterialRelation>,
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
    @InjectRepository(ServiceItem)
    private readonly serviceItemRepository: Repository<ServiceItem>,
    @InjectRepository(MaterialFile)
    private readonly materialFileRepository: Repository<MaterialFile>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(ProgressRecord)
    private readonly progressRepository: Repository<ProgressRecord>,
    private readonly dataSource: DataSource,
  ) {}

  private generateJointApplicationNo(): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `LH${y}${m}${d}${rand}`;
  }

  private generateApplicationNo(): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `BS${y}${m}${d}${rand}`;
  }

  async create(data: CreateJointApplicationData) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      this.logger.log(
        `开始创建联合申报: userId=${data.userId}, 事项数=${data.subApplications.length}, 文件数=${data.files.length}`,
      );

      const user = await queryRunner.manager.findOne(User, {
        where: { id: data.userId },
      });
      if (!user) {
        throw new NotFoundException('用户不存在');
      }

      if (!data.subApplications || data.subApplications.length < 2) {
        throw new BadRequestException('联合申报至少需要选择2个事项');
      }

      const serviceItemIds = data.subApplications.map(s => s.serviceItemId);
      const uniqueIds = [...new Set(serviceItemIds)];
      if (uniqueIds.length !== serviceItemIds.length) {
        throw new BadRequestException('不能重复选择相同的办事事项');
      }

      const serviceItems = await queryRunner.manager.find(ServiceItem, {
        where: { id: In(uniqueIds), active: true },
      });
      if (serviceItems.length !== uniqueIds.length) {
        throw new BadRequestException('部分办事事项不存在或已停用');
      }

      const jointApplicationNo = this.generateJointApplicationNo();
      const jointApplication = queryRunner.manager.create(JointApplication, {
        jointApplicationNo,
        userId: data.userId,
        title: data.title,
        formData: JSON.stringify(data.formData),
        status: 'submitted',
        totalItems: data.subApplications.length,
        approvedItems: 0,
        rejectedItems: 0,
        processingItems: 0,
      });
      const savedJointApp = await queryRunner.manager.save(jointApplication);
      this.logger.log(`联合申报主表已创建: id=${savedJointApp.id}, no=${jointApplicationNo}`);

      const uploadedFileMap = new Map<string, {
        fileData: { fieldName: string; file: Express.Multer.File };
        materialInfo: MaterialInfo;
      }>();

      for (const fileData of data.files) {
        const materialInfo = this.findMaterialInfo(
          data.subApplications,
          fileData.fieldName,
        );
        if (!materialInfo) {
          this.logger.warn(
            `未找到字段 ${fileData.fieldName} 对应的材料信息，跳过`,
          );
          continue;
        }
        uploadedFileMap.set(fileData.fieldName, { fileData, materialInfo });
        this.logger.log(
          `匹配文件: field=${fileData.fieldName}, name=${materialInfo.name}, shared=${materialInfo.isShared}, serviceItems=${materialInfo.serviceItemIds?.join(',')}`,
        );
      }

      this.logger.log(`文件匹配完成，共 ${uploadedFileMap.size} 个有效文件`);

      interface FileBlueprint {
        fieldName: string;
        materialName: string;
        required: boolean;
        originalName: string;
        fileName: string;
        filePath: string;
        fileSize: number;
        mimeType: string;
      }

      const savedSubApps: Array<{
        sub: JointSubApplication;
        app: Application;
        serviceItem: ServiceItem | undefined;
        subData: SubApplicationData;
      }> = [];

      for (let i = 0; i < data.subApplications.length; i++) {
        const subData = data.subApplications[i];
        const serviceItem = serviceItems.find(
          s => s.id === subData.serviceItemId,
        );

        const subApplication = queryRunner.manager.create(JointSubApplication, {
          jointApplicationId: savedJointApp.id,
          serviceItemId: subData.serviceItemId,
          splitStatus: 'splitting',
          status: 'pending',
          formData: JSON.stringify(subData.formData),
          sortOrder: subData.sortOrder || i,
        });
        const savedSubApp = await queryRunner.manager.save(subApplication);

        const applicationNo = this.generateApplicationNo();
        const application = queryRunner.manager.create(Application, {
          applicationNo,
          userId: data.userId,
          serviceItemId: subData.serviceItemId,
          formData: JSON.stringify({
            ...data.formData,
            ...subData.formData,
            _jointApplicationId: savedJointApp.id,
            _jointSubApplicationId: savedSubApp.id,
          }),
          materials: JSON.stringify(subData.materialsInfo || []),
          status: 'submitted',
        });
        const savedApp = await queryRunner.manager.save(application);

        savedSubApp.applicationId = savedApp.id;
        savedSubApp.splitStatus = 'completed';
        savedSubApp.status = 'submitted';
        await queryRunner.manager.save(savedSubApp);

        savedSubApps.push({ sub: savedSubApp, app: savedApp, serviceItem, subData });
        this.logger.log(
          `事项 ${subData.serviceItemId} 拆单完成: subId=${savedSubApp.id}, appId=${savedApp.id}, appNo=${applicationNo}`,
        );
      }

      this.logger.log(`拆单完成，共 ${savedSubApps.length} 个子申请，开始分配材料...`);

      const jointMaterialRelationRecords: JointMaterialRelation[] = [];

      for (const [fieldName, entry] of uploadedFileMap.entries()) {
        const { fileData, materialInfo } = entry;

        const relatedServiceItemIds =
          materialInfo.serviceItemIds?.length > 0
            ? materialInfo.serviceItemIds
            : data.subApplications.map(s => s.serviceItemId);

        const sharedBlueprint: FileBlueprint = {
          fieldName,
          materialName: materialInfo.name,
          required: materialInfo.required,
          originalName: fileData.file.originalname,
          fileName: fileData.file.filename,
          filePath: fileData.file.path,
          fileSize: fileData.file.size,
          mimeType: fileData.file.mimetype,
        };

        let firstSavedMaterialFileId: number | null = null;
        const appliedApplicationIds: number[] = [];
        const appliedServiceItemIds: number[] = [];

        for (const saved of savedSubApps) {
          const shouldApply = relatedServiceItemIds.includes(
            saved.sub.serviceItemId,
          );
          if (!shouldApply) continue;

          const matForSub = (saved.subData.materialsInfo || []).find(
            m => m.fieldName === fieldName,
          );
          const matName =
            matForSub?.name || sharedBlueprint.materialName;
          const matRequired =
            matForSub?.required ?? sharedBlueprint.required;

          const materialFile = queryRunner.manager.create(MaterialFile, {
            applicationId: saved.app.id,
            fieldName: sharedBlueprint.fieldName,
            materialName: matName,
            originalName: sharedBlueprint.originalName,
            fileName: sharedBlueprint.fileName,
            filePath: sharedBlueprint.filePath,
            fileSize: sharedBlueprint.fileSize,
            mimeType: sharedBlueprint.mimeType,
            required: matRequired,
            version: 1,
            isCurrent: true,
            status: 'normal',
            uploaderId: data.userId,
          });
          const savedMaterialFile =
            await queryRunner.manager.save(materialFile);

          if (!firstSavedMaterialFileId) {
            firstSavedMaterialFileId = savedMaterialFile.id;
          }
          appliedApplicationIds.push(saved.app.id);
          if (!appliedServiceItemIds.includes(saved.sub.serviceItemId)) {
            appliedServiceItemIds.push(saved.sub.serviceItemId);
          }

          this.logger.log(
            `  材料落库: field=${fieldName}, appId=${saved.app.id}, matFileId=${savedMaterialFile.id}, item=${saved.sub.serviceItemId}`,
          );
        }

        if (firstSavedMaterialFileId !== null) {
          const relation = queryRunner.manager.create(JointMaterialRelation, {
            jointApplicationId: savedJointApp.id,
            materialFileId: firstSavedMaterialFileId,
            materialName: sharedBlueprint.materialName,
            fieldName,
            isShared: materialInfo.isShared || relatedServiceItemIds.length > 1,
            usedByServiceItemIds: appliedServiceItemIds,
            usedByApplicationIds: appliedApplicationIds,
          });
          const savedRelation = await queryRunner.manager.save(relation);
          jointMaterialRelationRecords.push(savedRelation);

          this.logger.log(
            `  材料关系记录: field=${fieldName}, shared=${relation.isShared}, items=${appliedServiceItemIds.join(',')}, apps=${appliedApplicationIds.join(',')}`,
          );
        }
      }

      for (const saved of savedSubApps) {
        await queryRunner.manager.save(ProgressRecord, {
          applicationId: saved.app.id,
          step: '联合申报拆单',
          status: 'completed',
          remark: `从联合申报（${jointApplicationNo}）拆单生成，事项：${saved.serviceItem?.name}`,
          operatorId: data.userId,
        });

        await queryRunner.manager.save(ProgressRecord, {
          applicationId: saved.app.id,
          step: '提交申请',
          status: 'completed',
          remark: '用户已成功提交申请材料（联合申报）',
          operatorId: data.userId,
        });
      }

      await queryRunner.manager.save(Message, {
        userId: data.userId,
        title: '联合申报提交成功',
        content: `您的联合申报（编号：${jointApplicationNo}）已成功提交，共包含 ${data.subApplications.length} 个办事事项，系统已自动拆单处理。`,
        type: 'application',
      });

      await this.updateJointAppStatus(savedJointApp.id, queryRunner.manager);

      await queryRunner.commitTransaction();
      this.logger.log(
        `联合申报创建成功: jointAppId=${savedJointApp.id}, 子申请=${savedSubApps.length}, 材料关系=${jointMaterialRelationRecords.length}`,
      );
      return this.findOne(savedJointApp.id);
    } catch (error) {
      this.logger.error(`联合申报创建失败: ${(error as Error).message}`, (error as Error).stack);
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private findMaterialInfo(
    subApplications: SubApplicationData[],
    fieldName: string,
  ): MaterialInfo | null {
    for (const sub of subApplications) {
      const found = sub.materialsInfo?.find(m => m.fieldName === fieldName);
      if (found) {
        const relatedItems = subApplications
          .filter(s => s.materialsInfo?.some(m => m.fieldName === fieldName))
          .map(s => s.serviceItemId);

        const isShared = found.isShared || relatedItems.length > 1;
        const allItemIds = isShared
          ? relatedItems
          : (found.serviceItemIds?.length ? found.serviceItemIds : [sub.serviceItemId]);

        return {
          ...found,
          isShared,
          serviceItemIds: allItemIds,
        };
      }
    }
    return null;
  }

  async findByUserId(userId: number) {
    const apps = await this.jointAppRepository.find({
      where: { userId },
      relations: ['subApplications', 'subApplications.serviceItem', 'subApplications.application'],
      order: { createdAt: 'DESC' },
    });
    return apps.map(a => this.transformJointApplication(a));
  }

  async findAll(status?: string) {
    const where: any = {};
    if (status) where.status = status;
    const apps = await this.jointAppRepository.find({
      where,
      relations: [
        'user',
        'subApplications',
        'subApplications.serviceItem',
        'subApplications.application',
      ],
      order: { createdAt: 'DESC' },
    });
    return apps.map(a => this.transformJointApplication(a, true));
  }

  async findOne(id: number) {
    const app = await this.jointAppRepository.findOne({
      where: { id },
      relations: [
        'user',
        'subApplications',
        'subApplications.serviceItem',
        'subApplications.application',
        'subApplications.application.materialFiles',
        'subApplications.application.progressRecords',
      ],
    });
    if (!app) throw new NotFoundException('联合申报不存在');

    const materialRelations = await this.materialRelationRepository.find({
      where: { jointApplicationId: id },
      relations: ['materialFile'],
    });

    const result = this.transformJointApplication(app, true) as any;
    result.materialRelations = materialRelations.map(r => ({
      ...r,
      usedByServiceItemIds: r.usedByServiceItemIds || [],
      usedByApplicationIds: r.usedByApplicationIds || [],
    }));

    return result;
  }

  async syncSubApplicationStatus(applicationId: number) {
    const subApp = await this.subAppRepository.findOne({
      where: { applicationId },
      relations: ['jointApplication'],
    });
    if (!subApp) return null;

    const application = await this.applicationRepository.findOne({
      where: { id: applicationId },
    });
    if (!application) return null;

    subApp.status = application.status;
    subApp.reviewComment = application.reviewComment;
    if (application.status === 'approved' || application.status === 'rejected' || application.status === 'completed') {
      subApp.completedAt = new Date();
    }
    await this.subAppRepository.save(subApp);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      await this.updateJointAppStatus(subApp.jointApplicationId, queryRunner.manager);
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

    return this.findOne(subApp.jointApplicationId);
  }

  private async updateJointAppStatus(jointAppId: number, manager: any) {
    const subApps = await manager.find(JointSubApplication, {
      where: { jointApplicationId: jointAppId },
    });

    let approved = 0;
    let rejected = 0;
    let processing = 0;

    for (const sub of subApps) {
      switch (sub.status) {
        case 'approved':
        case 'completed':
          approved++;
          break;
        case 'rejected':
          rejected++;
          break;
        case 'submitted':
        case 'reviewing':
        case 'supplementing':
          processing++;
          break;
      }
    }

    const jointApp = await manager.findOne(JointApplication, {
      where: { id: jointAppId },
      relations: ['user'],
    });
    if (!jointApp) return;

    jointApp.approvedItems = approved;
    jointApp.rejectedItems = rejected;
    jointApp.processingItems = processing;

    const total = subApps.length;
    let newStatus = jointApp.status;

    if (approved === total && total > 0) {
      newStatus = 'approved';
      jointApp.summary = `全部 ${total} 个事项均已审核通过`;
    } else if (rejected === total && total > 0) {
      newStatus = 'rejected';
      jointApp.summary = `全部 ${total} 个事项均被驳回`;
    } else if (approved + rejected === total && total > 0) {
      newStatus = 'completed';
      jointApp.summary = `审核完成：通过 ${approved} 项，驳回 ${rejected} 项`;
    } else if (processing > 0 || approved > 0 || rejected > 0) {
      newStatus = 'processing';
    }

    if (newStatus !== jointApp.status) {
      jointApp.status = newStatus;

      if (jointApp.user && (newStatus === 'approved' || newStatus === 'rejected' || newStatus === 'completed')) {
        await manager.save(Message, {
          userId: jointApp.user.id,
          title: '联合申报审批完成',
          content: `您的联合申报（编号：${jointApp.jointApplicationNo}）已完成全部审批。${jointApp.summary || ''}`,
          type: 'application',
        });
      }
    }

    await manager.save(jointApp);
  }

  async getApprovalSummary(jointAppId: number) {
    const jointApp = await this.findOne(jointAppId);
    const subApps = (jointApp as any).subApplications || [];

    const summary: any = {
      jointApplicationId: jointAppId,
      total: subApps.length,
      approved: 0,
      rejected: 0,
      processing: 0,
      pending: 0,
      items: [],
    };

    for (const sub of subApps) {
      const item = {
        subApplicationId: sub.id,
        applicationId: sub.applicationId,
        applicationNo: sub.application?.applicationNo,
        serviceItemId: sub.serviceItemId,
        serviceItemName: sub.serviceItem?.name,
        status: sub.status,
        reviewComment: sub.reviewComment,
        completedAt: sub.completedAt,
      };
      summary.items.push(item);

      switch (sub.status) {
        case 'approved':
        case 'completed':
          summary.approved++;
          break;
        case 'rejected':
          summary.rejected++;
          break;
        case 'submitted':
        case 'reviewing':
        case 'supplementing':
          summary.processing++;
          break;
        default:
          summary.pending++;
      }
    }

    return summary;
  }

  async getMaterialReuseStats(jointAppId: number) {
    const relations = await this.materialRelationRepository.find({
      where: { jointApplicationId: jointAppId },
      relations: ['materialFile'],
    });

    const sharedMaterials = relations.filter(r => r.isShared);
    const totalReused = sharedMaterials.reduce((sum, r) => {
      const count = (r.usedByServiceItemIds?.length || 0);
      return sum + Math.max(0, count - 1);
    }, 0);

    return {
      jointApplicationId: jointAppId,
      totalMaterials: relations.length,
      sharedMaterials: sharedMaterials.length,
      totalReusedTimes: totalReused,
      savedUploads: totalReused,
      details: relations.map(r => ({
        id: r.id,
        materialName: r.materialName,
        fieldName: r.fieldName,
        isShared: r.isShared,
        usedByServiceItemIds: r.usedByServiceItemIds || [],
        usedByApplicationIds: r.usedByApplicationIds || [],
        reuseCount: Math.max(0, (r.usedByServiceItemIds?.length || 0) - 1),
      })),
    };
  }

  private transformJointApplication(
    app: JointApplication,
    includeUser = false,
  ) {
    const result: any = {
      ...app,
      formData: app.formData ? JSON.parse(app.formData) : null,
      subApplications: app.subApplications?.map(sub => ({
        ...sub,
        formData: sub.formData ? JSON.parse(sub.formData) : null,
        application: sub.application
          ? {
              ...sub.application,
              formData: sub.application.formData
                ? JSON.parse(sub.application.formData)
                : null,
              materials: sub.application.materials
                ? JSON.parse(sub.application.materials)
                : [],
            }
          : null,
      })) || [],
    };
    if (includeUser && app.user) {
      result.user = { ...app.user, password: undefined };
    }
    return result;
  }

  async getAvailableServiceItems() {
    return this.serviceItemRepository.find({
      where: { active: true, publishStatus: 'published' },
      order: { category: 'ASC', name: 'ASC' },
    });
  }
}
