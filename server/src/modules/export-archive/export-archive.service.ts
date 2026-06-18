import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Between, Like } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import * as dayjs from 'dayjs';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const archiver = require('archiver');
import { ExportArchive } from '../../entities/export-archive.entity';
import { Application } from '../../entities/application.entity';
import { ApprovalRecord } from '../../entities/approval-record.entity';
import { ApprovalHistory } from '../../entities/approval-history.entity';
import { ProgressRecord } from '../../entities/progress-record.entity';
import { MaterialFile } from '../../entities/material-file.entity';
import { User } from '../../entities/user.entity';
import { ServiceItem } from '../../entities/service-item.entity';

export interface ExportQueryDto {
  page?: number;
  pageSize?: number;
  status?: string;
  startDate?: string;
  endDate?: string;
  keyword?: string;
  operatorId?: number;
}

export interface CreateExportDto {
  applicationIds: number[];
  operatorId: number;
}

@Injectable()
export class ExportArchiveService {
  constructor(
    @InjectRepository(ExportArchive) private readonly archiveRepository: Repository<ExportArchive>,
    @InjectRepository(Application) private readonly appRepository: Repository<Application>,
    @InjectRepository(ApprovalRecord) private readonly approvalRecordRepository: Repository<ApprovalRecord>,
    @InjectRepository(ApprovalHistory) private readonly approvalHistoryRepository: Repository<ApprovalHistory>,
    @InjectRepository(ProgressRecord) private readonly progressRepository: Repository<ProgressRecord>,
    @InjectRepository(MaterialFile) private readonly materialFileRepository: Repository<MaterialFile>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(ServiceItem) private readonly serviceItemRepository: Repository<ServiceItem>,
  ) {}

  generateArchiveNo() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `GD${y}${m}${d}${rand}`;
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

  async createExportTask(dto: CreateExportDto) {
    if (!dto.applicationIds || dto.applicationIds.length === 0) {
      throw new BadRequestException('请选择要导出的办件');
    }

    const applications = await this.appRepository.find({
      where: { id: In(dto.applicationIds) },
      relations: ['user', 'serviceItem'],
    });

    if (applications.length === 0) {
      throw new NotFoundException('未找到指定的办件');
    }

    const archiveNo = this.generateArchiveNo();
    const archive = this.archiveRepository.create({
      archiveNo,
      applicationIds: JSON.stringify(dto.applicationIds),
      status: 'pending',
      operatorId: dto.operatorId,
      applicationCount: applications.length,
    });

    const saved = await this.archiveRepository.save(archive);

    setImmediate(() => {
      this.processExportTask(saved.id).catch(err => {
        console.error('导出任务处理失败:', err);
      });
    });

    return this.findOne(saved.id);
  }

  private async processExportTask(archiveId: number) {
    try {
      await this.archiveRepository.update(archiveId, { status: 'processing' });

      const archive = await this.archiveRepository.findOne({ where: { id: archiveId } });
      if (!archive) throw new NotFoundException('归档记录不存在');

      const applicationIds: number[] = JSON.parse(archive.applicationIds);

      const exportDir = path.join(process.cwd(), 'uploads', 'archives');
      if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir, { recursive: true });
      }

      const fileName = `${archive.archiveNo}_${dayjs().format('YYYYMMDDHHmmss')}.zip`;
      const filePath = path.join(exportDir, fileName);
      const output = fs.createWriteStream(filePath);
      const archiveZip = archiver('zip', { zlib: { level: 9 } });

      archiveZip.pipe(output);

      for (const appId of applicationIds) {
        await this.addApplicationToArchive(archiveZip, appId);
      }

      const summaryData = await this.buildSummary(applicationIds);
      archiveZip.append(JSON.stringify(summaryData, null, 2), { name: '导出汇总.json' });

      await archiveZip.finalize();

      await new Promise<void>((resolve, reject) => {
        output.on('close', () => resolve());
        output.on('error', (err) => reject(err));
      });

      const stat = fs.statSync(filePath);

      await this.archiveRepository.update(archiveId, {
        status: 'completed',
        fileName,
        filePath,
        fileSize: stat.size,
        completedAt: new Date(),
      });
    } catch (error: any) {
      await this.archiveRepository.update(archiveId, {
        status: 'failed',
        failReason: error.message || '导出处理失败',
      });
    }
  }

  private async addApplicationToArchive(archiveZip: any, appId: number) {
    const app = await this.appRepository.findOne({
      where: { id: appId },
      relations: ['user', 'serviceItem'],
    });
    if (!app) return;

    const appDirName = `${app.applicationNo}_${app.serviceItem?.code || '未知事项'}`;
    const safeDirName = appDirName.replace(/[\\/:*?"<>|]/g, '_');

    const detailData = await this.buildApplicationDetail(app);
    archiveZip.append(JSON.stringify(detailData, null, 2), {
      name: `${safeDirName}/申请明细.json`,
    });

    const approvalData = await this.buildApprovalRecords(appId);
    archiveZip.append(JSON.stringify(approvalData, null, 2), {
      name: `${safeDirName}/审核记录.json`,
    });

    const progressData = await this.buildProgressRecords(appId);
    archiveZip.append(JSON.stringify(progressData, null, 2), {
      name: `${safeDirName}/办理进度.json`,
    });

    const materials = await this.materialFileRepository.find({
      where: { applicationId: appId, isCurrent: true },
    });

    const materialListData = materials.map(m => ({
      材料名称: m.materialName,
      字段标识: m.fieldName,
      原始文件名: m.originalName,
      文件大小: this.formatFileSize(m.fileSize),
      MIME类型: m.mimeType,
      是否必传: m.required ? '是' : '否',
      版本: m.version,
      状态: m.status,
      上传时间: dayjs(m.createdAt).format('YYYY-MM-DD HH:mm:ss'),
    }));
    archiveZip.append(JSON.stringify({
      材料清单: materialListData,
      材料总数: materials.length,
    }, null, 2), {
      name: `${safeDirName}/材料清单.json`,
    });

    const materialDir = `${safeDirName}/材料附件`;
    for (const m of materials) {
      if (fs.existsSync(m.filePath)) {
        archiveZip.file(m.filePath, {
          name: `${materialDir}/${m.materialName}_${m.id}_${m.originalName}`,
        });
      }
    }
  }

  private async buildApplicationDetail(app: Application) {
    const operator = app.reviewerId
      ? await this.userRepository.findOne({ where: { id: app.reviewerId } })
      : null;

    return {
      基本信息: {
        申请编号: app.applicationNo,
        办件ID: app.id,
        事项名称: app.serviceItem?.name || '',
        事项编码: app.serviceItem?.code || '',
        事项分类: app.serviceItem?.category || '',
        办理状态: this.getStatusLabel(app.status),
        原始状态: app.status,
        是否重新提交: app.isResubmit ? '是' : '否',
        重新提交次数: app.resubmitCount,
        撤回次数: app.withdrawalCount,
        关联原始申请ID: app.originalApplicationId || null,
        提交时间: dayjs(app.createdAt).format('YYYY-MM-DD HH:mm:ss'),
        最后更新时间: dayjs(app.updatedAt).format('YYYY-MM-DD HH:mm:ss'),
        最后撤回时间: app.lastWithdrawnAt ? dayjs(app.lastWithdrawnAt).format('YYYY-MM-DD HH:mm:ss') : null,
      },
      申请人信息: {
        用户ID: app.userId,
        姓名: app.user?.name || '',
        身份证号: app.user?.idCard || '',
        联系电话: app.user?.phone || '',
        用户名: app.user?.username || '',
      },
      审核信息: {
        审核人ID: app.reviewerId || null,
        审核人姓名: operator?.name || '',
        审核意见: app.reviewComment || '',
      },
      申请表单数据: app.formData ? JSON.parse(app.formData) : {},
      材料配置信息: app.materials ? JSON.parse(app.materials) : [],
    };
  }

  private async buildApprovalRecords(appId: number) {
    const records = await this.approvalRecordRepository.find({
      where: { applicationId: appId },
      relations: ['approver', 'currentNode'],
      order: { createdAt: 'ASC' },
    });

    const histories = await this.approvalHistoryRepository.find({
      where: { applicationId: appId },
      relations: ['operator', 'node'],
      order: { createdAt: 'ASC' },
    });

    return {
      当前审批记录: records.map(r => ({
        ID: r.id,
        流程ID: r.flowId,
        当前节点ID: r.currentNodeId,
        当前节点名称: r.currentNode?.nodeName || '',
        审批人ID: r.approverId || null,
        审批人姓名: r.approver?.name || '',
        审批状态: this.getApprovalStatusLabel(r.status),
        原始状态: r.status,
        审批意见: r.comment || '',
        审批时间: r.approvedAt ? dayjs(r.approvedAt).format('YYYY-MM-DD HH:mm:ss') : null,
        创建时间: dayjs(r.createdAt).format('YYYY-MM-DD HH:mm:ss'),
      })),
      审批流转历史: histories.map(h => ({
        ID: h.id,
        流程ID: h.flowId,
        节点ID: h.nodeId,
        节点名称: h.node?.nodeName || '',
        操作人ID: h.operatorId,
        操作人姓名: h.operator?.name || '',
        操作类型: this.getActionLabel(h.action),
        操作原始值: h.action,
        备注说明: h.remark || '',
        目标节点ID: h.targetNodeId || null,
        上一节点ID: h.previousNodeId || null,
        '处理时长(分钟)': h.durationMinutes,
        操作时间: dayjs(h.createdAt).format('YYYY-MM-DD HH:mm:ss'),
      })),
    };
  }

  private async buildProgressRecords(appId: number) {
    const records = await this.progressRepository.find({
      where: { applicationId: appId },
      order: { createdAt: 'ASC' },
    });

    const operatorIds = records
      .map(r => r.operatorId)
      .filter((id, idx, arr) => id && arr.indexOf(id) === idx);

    const operators = operatorIds.length > 0
      ? await this.userRepository.find({ where: { id: In(operatorIds) } })
      : [];
    const operatorMap = new Map(operators.map(o => [o.id, o.name]));

    return {
      办理进度记录: records.map(r => ({
        ID: r.id,
        步骤名称: r.step,
        步骤状态: r.status,
        备注说明: r.remark || '',
        操作人ID: r.operatorId || null,
        操作人姓名: r.operatorId ? operatorMap.get(r.operatorId) || '' : '',
        创建时间: dayjs(r.createdAt).format('YYYY-MM-DD HH:mm:ss'),
      })),
      进度总数: records.length,
    };
  }

  private async buildSummary(applicationIds: number[]) {
    const apps = await this.appRepository.find({
      where: { id: In(applicationIds) },
      relations: ['user', 'serviceItem'],
    });

    const statusCount: Record<string, number> = {};
    const categoryCount: Record<string, number> = {};

    apps.forEach(app => {
      const label = this.getStatusLabel(app.status);
      statusCount[label] = (statusCount[label] || 0) + 1;
      if (app.serviceItem?.category) {
        categoryCount[app.serviceItem.category] = (categoryCount[app.serviceItem.category] || 0) + 1;
      }
    });

    return {
      导出时间: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      导出办件总数: apps.length,
      状态统计: statusCount,
      分类统计: categoryCount,
      办件列表: apps.map(app => ({
        申请编号: app.applicationNo,
        事项名称: app.serviceItem?.name || '',
        事项编码: app.serviceItem?.code || '',
        申请人: app.user?.name || '',
        身份证号: app.user?.idCard || '',
        联系电话: app.user?.phone || '',
        办理状态: this.getStatusLabel(app.status),
        提交时间: dayjs(app.createdAt).format('YYYY-MM-DD HH:mm:ss'),
      })),
    };
  }

  private getApprovalStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: '待审批',
      approved: '已通过',
      rejected: '已驳回',
      transferred: '已转办',
      withdrawn: '已撤回',
    };
    return labels[status] || status;
  }

  private getActionLabel(action: string): string {
    const labels: Record<string, string> = {
      approve: '通过',
      reject: '驳回',
      transfer: '转办',
      withdraw: '撤回',
      enter: '进入节点',
      complete: '完成',
    };
    return labels[action] || action;
  }

  private formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  }

  async findAll(query: ExportQueryDto) {
    const { page = 1, pageSize = 10, status, startDate, endDate, keyword, operatorId } = query;

    const where: any = {};
    if (status) where.status = status;
    if (operatorId) where.operatorId = operatorId;

    if (startDate && endDate) {
      where.createdAt = Between(new Date(startDate), new Date(endDate));
    } else if (startDate) {
      where.createdAt = Between(new Date(startDate), new Date());
    } else if (endDate) {
      where.createdAt = Between(new Date(0), new Date(endDate));
    }

    const skip = (page - 1) * pageSize;
    const [list, total] = await this.archiveRepository.findAndCount({
      where: keyword
        ? [{ ...where, archiveNo: Like(`%${keyword}%`) }, { ...where, fileName: Like(`%${keyword}%`) }]
        : where,
      relations: ['operator'],
      order: { createdAt: 'DESC' },
      skip,
      take: pageSize,
    });

    return {
      list: list.map(item => this.transformArchive(item)),
      total,
      page: Number(page),
      pageSize: Number(pageSize),
    };
  }

  async findOne(id: number) {
    const archive = await this.archiveRepository.findOne({
      where: { id },
      relations: ['operator'],
    });
    if (!archive) throw new NotFoundException('归档记录不存在');
    return this.transformArchive(archive);
  }

  private transformArchive(archive: ExportArchive) {
    const applicationIds: number[] = JSON.parse(archive.applicationIds);
    return {
      ...archive,
      applicationIds,
      operator: archive.operator ? { ...archive.operator, password: undefined } : undefined,
      fileSizeLabel: this.formatFileSize(archive.fileSize),
    };
  }

  async getFilePath(id: number) {
    const archive = await this.archiveRepository.findOne({ where: { id } });
    if (!archive) throw new NotFoundException('归档记录不存在');
    if (archive.status !== 'completed') {
      throw new BadRequestException(`当前归档状态为${archive.status}，无法下载`);
    }
    if (!archive.filePath || !fs.existsSync(archive.filePath)) {
      throw new NotFoundException('归档文件不存在');
    }
    return {
      filePath: archive.filePath,
      fileName: archive.fileName,
      fileSize: archive.fileSize,
    };
  }

  async getApplicationExportData(applicationId: number) {
    const app = await this.appRepository.findOne({
      where: { id: applicationId },
      relations: ['user', 'serviceItem'],
    });
    if (!app) throw new NotFoundException('申请不存在');

    const detail = await this.buildApplicationDetail(app);
    const approval = await this.buildApprovalRecords(applicationId);
    const progress = await this.buildProgressRecords(applicationId);

    const materials = await this.materialFileRepository.find({
      where: { applicationId, isCurrent: true },
    });
    const materialList = materials.map(m => ({
      id: m.id,
      materialName: m.materialName,
      fieldName: m.fieldName,
      originalName: m.originalName,
      fileName: m.fileName,
      filePath: m.filePath,
      fileSize: m.fileSize,
      fileSizeLabel: this.formatFileSize(m.fileSize),
      mimeType: m.mimeType,
      required: m.required,
      version: m.version,
      status: m.status,
      uploaderId: m.uploaderId,
      rejectReason: m.rejectReason,
      createdAt: m.createdAt,
    }));

    return {
      applicationDetail: detail,
      approvalRecords: approval,
      progressRecords: progress,
      materials: materialList,
    };
  }

  async delete(id: number) {
    const archive = await this.archiveRepository.findOne({ where: { id } });
    if (!archive) throw new NotFoundException('归档记录不存在');
    if (archive.filePath && fs.existsSync(archive.filePath)) {
      try {
        fs.unlinkSync(archive.filePath);
      } catch (e) {
        // ignore
      }
    }
    await this.archiveRepository.delete(id);
    return { success: true };
  }
}
