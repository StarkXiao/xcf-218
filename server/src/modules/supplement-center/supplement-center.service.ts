import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { MaterialFile } from '../../entities/material-file.entity';
import { SupplementRecord } from '../../entities/supplement-record.entity';
import { Application } from '../../entities/application.entity';
import { ProgressRecord } from '../../entities/progress-record.entity';
import { Message } from '../../entities/message.entity';
import { User } from '../../entities/user.entity';

interface RejectedMaterial {
  fieldName: string;
  materialName: string;
  reason: string;
}

interface RejectMaterialsData {
  applicationId: number;
  operatorId: number;
  rejectReason: string;
  rejectedMaterials: RejectedMaterial[];
}

@Injectable()
export class SupplementCenterService {
  constructor(
    @InjectRepository(MaterialFile) private readonly fileRepository: Repository<MaterialFile>,
    @InjectRepository(SupplementRecord) private readonly supplementRepository: Repository<SupplementRecord>,
    @InjectRepository(Application) private readonly appRepository: Repository<Application>,
    @InjectRepository(ProgressRecord) private readonly progressRepository: Repository<ProgressRecord>,
    @InjectRepository(Message) private readonly messageRepository: Repository<Message>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  async rejectMaterials(data: RejectMaterialsData) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const app = await this.appRepository.findOne({
        where: { id: data.applicationId },
        relations: ['serviceItem', 'user'],
      });
      if (!app) {
        throw new NotFoundException('申请不存在');
      }

      if (!['reviewing'].includes(app.status)) {
        throw new BadRequestException('当前申请状态不支持退回材料，请先进入审核阶段');
      }

      if (!data.rejectedMaterials || data.rejectedMaterials.length === 0) {
        throw new BadRequestException('请至少选择一项需要退回的材料');
      }

      const fieldNames = data.rejectedMaterials.map(m => m.fieldName);
      const currentFiles = await this.fileRepository.find({
        where: {
          applicationId: data.applicationId,
          fieldName: In(fieldNames),
          isCurrent: true,
        },
      });

      for (const file of currentFiles) {
        const rejected = data.rejectedMaterials.find(m => m.fieldName === file.fieldName);
        if (rejected) {
          file.status = 'rejected';
          file.rejectReason = rejected.reason;
          await queryRunner.manager.save(file);
        }
      }

      app.status = 'supplementing';
      app.reviewComment = data.rejectReason;
      app.reviewerId = data.operatorId;
      await queryRunner.manager.save(app);

      const supplementRecord = this.supplementRepository.create({
        applicationId: data.applicationId,
        operatorId: data.operatorId,
        rejectReason: data.rejectReason,
        rejectedMaterials: JSON.stringify(data.rejectedMaterials),
        status: 'pending',
      });
      await queryRunner.manager.save(supplementRecord);

      await queryRunner.manager.save(ProgressRecord, {
        applicationId: data.applicationId,
        step: '材料退回',
        status: 'pending',
        remark: data.rejectReason,
        operatorId: data.operatorId,
      });

      const rejectedMaterialNames = data.rejectedMaterials.map(m => `${m.materialName}（原因：${m.reason}）`).join('；');
      await queryRunner.manager.save(Message, {
        userId: app.userId,
        title: '申请材料需补充',
        content: `您的申请（编号：${app.applicationNo}，事项：${app.serviceItem?.name}）以下材料需要补充或修改：${rejectedMaterialNames}。请尽快在"补件中心"上传补充材料。`,
        type: 'supplement',
        applicationId: data.applicationId,
      });

      await queryRunner.commitTransaction();
      return this.getSupplementDetail(supplementRecord.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getUserSupplementList(userId: number) {
    const supplements = await this.supplementRepository
      .createQueryBuilder('sr')
      .leftJoinAndSelect('sr.application', 'app')
      .leftJoinAndSelect('app.serviceItem', 'si')
      .where('app.userId = :userId', { userId })
      .orderBy('sr.createdAt', 'DESC')
      .getMany();

    return Promise.all(supplements.map(async (sr) => this.transformSupplementRecord(sr)));
  }

  async getAdminSupplementList() {
    const supplements = await this.supplementRepository.find({
      relations: ['application', 'application.serviceItem', 'application.user', 'operator'],
      order: { createdAt: 'DESC' },
    });
    return Promise.all(supplements.map((sr) => this.transformSupplementRecord(sr, true)));
  }

  async getSupplementDetail(id: number) {
    const supplement = await this.supplementRepository.findOne({
      where: { id },
      relations: ['application', 'application.serviceItem', 'application.user', 'operator'],
    });
    if (!supplement) {
      throw new NotFoundException('补件记录不存在');
    }
    return this.transformSupplementRecord(supplement, true);
  }

  async getSupplementByApplicationId(applicationId: number) {
    const supplements = await this.supplementRepository.find({
      where: { applicationId },
      relations: ['operator'],
      order: { createdAt: 'DESC' },
    });
    return Promise.all(supplements.map((sr) => this.transformSupplementRecord(sr)));
  }

  async uploadSupplementMaterial(
    supplementId: number,
    fieldName: string,
    materialName: string,
    file: Express.Multer.File,
    uploaderId: number,
    required: boolean,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const supplement = await this.supplementRepository.findOne({
        where: { id: supplementId },
        relations: ['application'],
      });
      if (!supplement) {
        throw new NotFoundException('补件记录不存在');
      }

      if (supplement.status !== 'pending') {
        throw new BadRequestException('该补件记录已完成，无需再次上传');
      }

      const oldCurrentFile = await this.fileRepository.findOne({
        where: {
          applicationId: supplement.applicationId,
          fieldName,
          isCurrent: true,
        },
      });

      let newVersion = 1;
      if (oldCurrentFile) {
        oldCurrentFile.isCurrent = false;
        await queryRunner.manager.save(oldCurrentFile);
        newVersion = oldCurrentFile.version + 1;
      }

      const newFile = this.fileRepository.create({
        applicationId: supplement.applicationId,
        fieldName,
        materialName,
        originalName: file.originalname,
        fileName: file.filename,
        filePath: file.path,
        fileSize: file.size,
        mimeType: file.mimetype,
        required,
        version: newVersion,
        isCurrent: true,
        status: 'normal',
        uploaderId,
      });
      await queryRunner.manager.save(newFile);

      const remainingRejected = await this.checkRemainingRejected(supplement.applicationId);
      if (remainingRejected === 0) {
        supplement.status = 'completed';
        supplement.supplementTime = new Date();
        await queryRunner.manager.save(supplement);

        const app = supplement.application;
        app.status = 'reviewing';
        await queryRunner.manager.save(app);

        await queryRunner.manager.save(ProgressRecord, {
          applicationId: supplement.applicationId,
          step: '材料补充完成',
          status: 'completed',
          remark: '用户已完成所有材料的补充上传',
          operatorId: uploaderId,
        });

        const admins = await this.userRepository.find({ where: { role: 'admin' } });
        for (const admin of admins) {
          await queryRunner.manager.save(Message, {
            userId: admin.id,
            title: '材料补充通知',
            content: `申请（编号：${app.applicationNo}）的用户已完成材料补充，请及时审核。`,
            type: 'supplement',
            applicationId: supplement.applicationId,
          });
        }
      } else {
        await queryRunner.manager.save(ProgressRecord, {
          applicationId: supplement.applicationId,
          step: '材料补充中',
          status: 'pending',
          remark: `用户补充上传了材料：${materialName}`,
          operatorId: uploaderId,
        });
      }

      await queryRunner.commitTransaction();
      return this.getSupplementDetail(supplementId);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      await queryRunner.release();
      throw error;
    }
  }

  async getMaterialVersions(applicationId: number, fieldName: string) {
    return this.fileRepository.find({
      where: { applicationId, fieldName },
      order: { version: 'DESC' },
    });
  }

  async getRejectedMaterials(applicationId: number) {
    return this.fileRepository.find({
      where: {
        applicationId,
        status: 'rejected',
        isCurrent: true,
      },
    });
  }

  private async checkRemainingRejected(applicationId: number) {
    return this.fileRepository.count({
      where: {
        applicationId,
        status: 'rejected',
        isCurrent: true,
      },
    });
  }

  private async transformSupplementRecord(sr: SupplementRecord, includeOperator = false) {
    const rejectedMaterials = JSON.parse(sr.rejectedMaterials || '[]');
    const result: any = {
      ...sr,
      rejectedMaterials,
    };
    if (sr.application) {
      result.application = {
        ...sr.application,
        formData: sr.application.formData ? JSON.parse(sr.application.formData) : {},
        materials: sr.application.materials ? JSON.parse(sr.application.materials) : [],
      };
      if (sr.application.user) {
        result.application.user = { ...sr.application.user, password: undefined };
      }
    }
    if (includeOperator && sr.operator) {
      result.operator = { ...sr.operator, password: undefined };
    }
    const rejectedFiles = await this.fileRepository.find({
      where: {
        applicationId: sr.applicationId,
        isCurrent: true,
      },
    });
    result.currentFiles = rejectedFiles;
    return result;
  }
}
