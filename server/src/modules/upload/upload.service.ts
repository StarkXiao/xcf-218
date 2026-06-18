import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { MaterialFile } from '../../entities/material-file.entity';
import { Application } from '../../entities/application.entity';
import { ProgressRecord } from '../../entities/progress-record.entity';
import { Message } from '../../entities/message.entity';
import * as fs from 'fs';
import * as path from 'path';

export interface VersionDiffField {
  field: string;
  label: string;
  oldValue: any;
  newValue: any;
  changed: boolean;
}

export interface VersionDiff {
  v1: MaterialFile | null;
  v2: MaterialFile | null;
  fields: VersionDiffField[];
  changed: boolean;
  canPreview: boolean;
}

@Injectable()
export class UploadService {
  constructor(
    @InjectRepository(MaterialFile) private readonly fileRepository: Repository<MaterialFile>,
    @InjectRepository(Application) private readonly appRepository: Repository<Application>,
    @InjectRepository(ProgressRecord) private readonly progressRepository: Repository<ProgressRecord>,
    @InjectRepository(Message) private readonly messageRepository: Repository<Message>,
    private readonly dataSource: DataSource,
  ) {}

  async saveFile(
    applicationId: number,
    materialName: string,
    file: Express.Multer.File,
    required: boolean,
  ) {
    const materialFile = this.fileRepository.create({
      applicationId,
      materialName,
      originalName: file.originalname,
      fileName: file.filename,
      filePath: file.path,
      fileSize: file.size,
      mimeType: file.mimetype,
      required,
    });
    return this.fileRepository.save(materialFile);
  }

  async findByApplicationId(applicationId: number) {
    return this.fileRepository.find({
      where: { applicationId },
      order: { createdAt: 'ASC' },
    });
  }

  async findCurrentByApplicationId(applicationId: number) {
    return this.fileRepository.find({
      where: { applicationId, isCurrent: true },
      order: { createdAt: 'ASC' },
    });
  }

  async findOne(id: number) {
    const file = await this.fileRepository.findOne({ where: { id } });
    if (!file) {
      throw new NotFoundException('文件不存在');
    }
    return file;
  }

  async getVersions(applicationId: number, fieldName: string) {
    return this.fileRepository.find({
      where: { applicationId, fieldName },
      order: { version: 'DESC' },
    });
  }

  async reuploadFile(
    fileId: number,
    file: Express.Multer.File,
    uploaderId: number,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const oldFile = await this.fileRepository.findOne({ where: { id: fileId } });
      if (!oldFile) {
        throw new NotFoundException('原文件不存在');
      }

      const app = await this.appRepository.findOne({ where: { id: oldFile.applicationId } });
      if (!app) {
        throw new NotFoundException('关联申请不存在');
      }

      if (app.status === 'approved' || app.status === 'completed') {
        throw new BadRequestException('申请已完成，无法重新上传材料');
      }

      oldFile.isCurrent = false;
      await queryRunner.manager.save(oldFile);

      const newFile = this.fileRepository.create({
        applicationId: oldFile.applicationId,
        fieldName: oldFile.fieldName,
        materialName: oldFile.materialName,
        originalName: file.originalname,
        fileName: file.filename,
        filePath: file.path,
        fileSize: file.size,
        mimeType: file.mimetype,
        required: oldFile.required,
        version: oldFile.version + 1,
        isCurrent: true,
        status: 'normal',
        uploaderId,
      });
      const savedFile = await queryRunner.manager.save(newFile);

      await queryRunner.manager.save(ProgressRecord, {
        applicationId: oldFile.applicationId,
        step: '材料重新上传',
        status: 'completed',
        remark: `材料「${oldFile.materialName}」已重新上传，版本从 v${oldFile.version} 升级到 v${newFile.version}`,
        operatorId: uploaderId,
      });

      const admins = await queryRunner.manager.find('user', { where: { role: 'admin' } });
      for (const admin of admins as any[]) {
        await queryRunner.manager.save(Message, {
          userId: admin.id,
          title: '材料重新上传通知',
          content: `申请（编号：${app.applicationNo}）的材料「${oldFile.materialName}」已由用户重新上传，请及时审核。`,
          type: 'system',
          applicationId: oldFile.applicationId,
        });
      }

      await queryRunner.commitTransaction();
      return savedFile;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async deleteFile(id: number, operatorId?: number) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const file = await this.findOne(id);
      const app = await this.appRepository.findOne({ where: { id: file.applicationId } });

      if (app && (app.status === 'approved' || app.status === 'completed')) {
        throw new BadRequestException('申请已完成，无法删除材料');
      }

      const physicalPath = this.getFilePath(file.fileName);
      if (fs.existsSync(physicalPath)) {
        try {
          fs.unlinkSync(physicalPath);
        } catch (e) {
          // ignore
        }
      }

      await queryRunner.manager.delete(MaterialFile, id);

      if (app && operatorId) {
        await queryRunner.manager.save(ProgressRecord, {
          applicationId: file.applicationId,
          step: '材料删除',
          status: 'completed',
          remark: `材料「${file.materialName}」已被删除`,
          operatorId,
        });
      }

      await queryRunner.commitTransaction();
      return { success: true };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async compareVersions(
    applicationId: number,
    fieldName: string,
    version1Id: number,
    version2Id: number,
  ): Promise<VersionDiff> {
    const [v1, v2] = await Promise.all([
      this.fileRepository.findOne({ where: { id: version1Id, applicationId, fieldName } }),
      this.fileRepository.findOne({ where: { id: version2Id, applicationId, fieldName } }),
    ]);

    if (!v1 || !v2) {
      throw new NotFoundException('指定的版本文件不存在');
    }

    const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
    const canPreview = (file: MaterialFile) => {
      const ext = file.originalName.split('.').pop()?.toLowerCase();
      if (!ext) return false;
      return [...IMAGE_EXTENSIONS, 'pdf'].includes(ext);
    };

    const fields: VersionDiffField[] = [
      {
        field: 'originalName',
        label: '文件名',
        oldValue: v1.originalName,
        newValue: v2.originalName,
        changed: v1.originalName !== v2.originalName,
      },
      {
        field: 'fileSize',
        label: '文件大小',
        oldValue: v1.fileSize,
        newValue: v2.fileSize,
        changed: v1.fileSize !== v2.fileSize,
      },
      {
        field: 'mimeType',
        label: '文件类型',
        oldValue: v1.mimeType,
        newValue: v2.mimeType,
        changed: v1.mimeType !== v2.mimeType,
      },
      {
        field: 'version',
        label: '版本号',
        oldValue: v1.version,
        newValue: v2.version,
        changed: v1.version !== v2.version,
      },
      {
        field: 'createdAt',
        label: '上传时间',
        oldValue: v1.createdAt,
        newValue: v2.createdAt,
        changed: v1.createdAt !== v2.createdAt,
      },
    ];

    const changed = fields.some(f => f.changed);
    const bothCanPreview = canPreview(v1) && canPreview(v2);

    return {
      v1,
      v2,
      fields,
      changed,
      canPreview: bothCanPreview,
    };
  }

  async getFileStats(applicationId: number) {
    const files = await this.findByApplicationId(applicationId);
    const currentFiles = files.filter(f => f.isCurrent);
    const rejectedFiles = currentFiles.filter(f => f.status === 'rejected');

    return {
      total: files.length,
      currentCount: currentFiles.length,
      rejectedCount: rejectedFiles.length,
      requiredCount: currentFiles.filter(f => f.required).length,
      optionalCount: currentFiles.filter(f => !f.required).length,
      totalSize: files.reduce((sum, f) => sum + f.fileSize, 0),
      hasMultipleVersions: files.length > currentFiles.length,
      versionsByField: files.reduce((acc, f) => {
        if (!acc[f.fieldName]) acc[f.fieldName] = 0;
        acc[f.fieldName]++;
        return acc;
      }, {} as Record<string, number>),
    };
  }

  getFilePath(fileName: string) {
    return path.join(process.cwd(), 'uploads', 'materials', fileName);
  }
}
