import {
  Injectable,
  NotFoundException,
  BadRequestException,
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

      const savedMaterialFiles: Map<string, MaterialFile> = new Map();
      const materialRelations: JointMaterialRelation[] = [];

      for (const fileData of data.files) {
        const materialInfo = this.findMaterialInfo(
          data.subApplications,
          fileData.fieldName,
        );
        if (!materialInfo) continue;

        const materialFile = queryRunner.manager.create(MaterialFile, {
          fieldName: fileData.fieldName,
          materialName: materialInfo.name,
          originalName: fileData.file.originalname,
          fileName: fileData.file.filename,
          filePath: fileData.file.path,
          fileSize: fileData.file.size,
          mimeType: fileData.file.mimetype,
          required: materialInfo.required,
          version: 1,
          isCurrent: true,
          status: 'normal',
          uploaderId: data.userId,
        });
        const savedFile = await queryRunner.manager.save(materialFile);
        savedMaterialFiles.set(fileData.fieldName, savedFile);

        const isShared = materialInfo.isShared || false;
        const relation = queryRunner.manager.create(JointMaterialRelation, {
          jointApplicationId: savedJointApp.id,
          materialFileId: savedFile.id,
          materialName: materialInfo.name,
          fieldName: fileData.fieldName,
          isShared,
          usedByServiceItemIds: materialInfo.serviceItemIds || [],
          usedByApplicationIds: [],
        });
        const savedRelation = await queryRunner.manager.save(relation);
        materialRelations.push(savedRelation);
      }

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
          materials: JSON.stringify(subData.materialsInfo),
          status: 'submitted',
        });
        const savedApp = await queryRunner.manager.save(application);

        savedSubApp.applicationId = savedApp.id;
        savedSubApp.splitStatus = 'completed';
        savedSubApp.status = 'submitted';
        await queryRunner.manager.save(savedSubApp);

        for (const matInfo of subData.materialsInfo) {
          let targetMaterialFile = savedMaterialFiles.get(matInfo.fieldName);

          if (!targetMaterialFile && matInfo.isShared) {
            for (const [fieldName, file] of savedMaterialFiles.entries()) {
              if (fieldName.startsWith('shared_') || fieldName.includes(matInfo.fieldName)) {
                targetMaterialFile = file;
                break;
              }
            }
          }

          if (targetMaterialFile) {
            const clonedMaterialFile = queryRunner.manager.create(MaterialFile, {
              applicationId: savedApp.id,
              fieldName: matInfo.fieldName,
              materialName: matInfo.name,
              originalName: targetMaterialFile.originalName,
              fileName: targetMaterialFile.fileName,
              filePath: targetMaterialFile.filePath,
              fileSize: targetMaterialFile.fileSize,
              mimeType: targetMaterialFile.mimeType,
              required: matInfo.required,
              version: 1,
              isCurrent: true,
              status: 'normal',
              uploaderId: data.userId,
            });
            const clonedFile = await queryRunner.manager.save(clonedMaterialFile);

            const relation = materialRelations.find(
              r => r.materialFileId === targetMaterialFile!.id,
            );
            if (relation) {
              if (!relation.usedByServiceItemIds) {
                relation.usedByServiceItemIds = [];
              }
              if (!relation.usedByServiceItemIds.includes(subData.serviceItemId)) {
                relation.usedByServiceItemIds.push(subData.serviceItemId);
              }
              if (!relation.usedByApplicationIds) {
                relation.usedByApplicationIds = [];
              }
              if (!relation.usedByApplicationIds.includes(savedApp.id)) {
                relation.usedByApplicationIds.push(savedApp.id);
              }
              await queryRunner.manager.save(relation);
            }
          }
        }

        await queryRunner.manager.save(ProgressRecord, {
          applicationId: savedApp.id,
          step: '联合申报拆单',
          status: 'completed',
          remark: `从联合申报（${jointApplicationNo}）拆单生成，事项：${serviceItem?.name}`,
          operatorId: data.userId,
        });

        await queryRunner.manager.save(ProgressRecord, {
          applicationId: savedApp.id,
          step: '提交申请',
          status: 'completed',
          remark: '用户已成功提交申请材料（联合申报）',
          operatorId: data.userId,
        });
      }

      await queryRunner.manager.save(ProgressRecord, {
        applicationId: 0,
        step: '联合申报提交',
        status: 'completed',
        remark: `联合申报提交成功，共 ${data.subApplications.length} 个事项`,
        operatorId: data.userId,
      });

      await queryRunner.manager.save(Message, {
        userId: data.userId,
        title: '联合申报提交成功',
        content: `您的联合申报（编号：${jointApplicationNo}）已成功提交，共包含 ${data.subApplications.length} 个办事事项，系统已自动拆单处理。`,
        type: 'application',
      });

      await this.updateJointAppStatus(savedJointApp.id, queryRunner.manager);

      await queryRunner.commitTransaction();
      return this.findOne(savedJointApp.id);
    } catch (error) {
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
      if (found) return found;
    }
    const sharedFieldName = fieldName.replace(/^shared_/, '');
    for (const sub of subApplications) {
      const found = sub.materialsInfo?.find(m => m.fieldName === sharedFieldName);
      if (found) return { ...found, isShared: true };
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
