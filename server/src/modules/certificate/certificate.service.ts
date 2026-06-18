import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Certificate } from '../../entities/certificate.entity';
import { CertificateDownloadRecord } from '../../entities/certificate-download-record.entity';
import { Application } from '../../entities/application.entity';
import { Message } from '../../entities/message.entity';
import { User } from '../../entities/user.entity';
import { ServiceItem } from '../../entities/service-item.entity';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class CertificateService {
  constructor(
    @InjectRepository(Certificate) private readonly certRepository: Repository<Certificate>,
    @InjectRepository(CertificateDownloadRecord) private readonly downloadRecordRepository: Repository<CertificateDownloadRecord>,
    @InjectRepository(Application) private readonly appRepository: Repository<Application>,
    @InjectRepository(Message) private readonly messageRepository: Repository<Message>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(ServiceItem) private readonly serviceItemRepository: Repository<ServiceItem>,
  ) {}

  async generateCertificate(applicationId: number, operatorId: number): Promise<Certificate> {
    const application = await this.appRepository.findOne({
      where: { id: applicationId },
      relations: ['user', 'serviceItem'],
    });
    if (!application) {
      throw new Error('申请不存在');
    }

    const existingCert = await this.certRepository.findOne({
      where: { applicationId },
    });
    if (existingCert) {
      return existingCert;
    }

    const certificateNo = this.generateCertificateNo();
    const certificateData = {
      applicationNo: application.applicationNo,
      userName: application.user.name,
      userIdCard: application.user.idCard,
      serviceItemName: application.serviceItem.name,
      serviceItemCode: application.serviceItem.code,
      formData: JSON.parse(application.formData || '{}'),
    };

    const certificateContent = this.generateCertificateContent(
      certificateNo,
      certificateData,
    );

    const certDir = path.join(process.cwd(), 'uploads', 'certificates');
    if (!fs.existsSync(certDir)) {
      fs.mkdirSync(certDir, { recursive: true });
    }

    const fileName = `${certificateNo}.html`;
    const filePath = path.join(certDir, fileName);
    fs.writeFileSync(filePath, certificateContent);

    const certificate = this.certRepository.create({
      certificateNo,
      userId: application.userId,
      applicationId: application.id,
      serviceItemId: application.serviceItemId,
      certificateType: application.serviceItem.category,
      certificateData: JSON.stringify(certificateData),
      certificateContent,
      filePath,
      fileName,
      status: 'generated',
      issuedBy: operatorId,
      issuedAt: new Date(),
    });

    const savedCert = await this.certRepository.save(certificate);

    await this.messageRepository.save({
      userId: application.userId,
      title: '电子证明已生成',
      content: `您的申请（编号：${application.applicationNo}）的电子证明已生成，证明编号：${certificateNo}，请前往"我的证明"查看和下载。`,
      type: 'certificate',
      applicationId: application.id,
    });

    return savedCert;
  }

  private generateCertificateNo(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `CERT${year}${month}${day}${random}`;
  }

  private generateCertificateContent(certNo: string, data: any): string {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>电子证明 - ${certNo}</title>
    <style>
        body { font-family: "SimSun", "宋体", serif; max-width: 800px; margin: 0 auto; padding: 40px; background: #fff; }
        .cert-header { text-align: center; border-bottom: 3px double #333; padding-bottom: 20px; margin-bottom: 30px; }
        .cert-title { font-size: 32px; font-weight: bold; letter-spacing: 8px; }
        .cert-no { font-size: 14px; color: #666; margin-top: 10px; }
        .cert-body { font-size: 16px; line-height: 2; }
        .cert-content { text-indent: 2em; margin: 20px 0; }
        .cert-info { margin: 10px 0; }
        .cert-info label { display: inline-block; width: 120px; color: #333; }
        .cert-footer { margin-top: 60px; text-align: right; }
        .cert-seal { font-size: 20px; font-weight: bold; color: #c00; }
        .cert-date { margin-top: 10px; }
        .cert-watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 80px; color: rgba(200, 200, 200, 0.2); pointer-events: none; z-index: -1; }
    </style>
</head>
<body>
    <div class="cert-watermark">电子证明</div>
    <div class="cert-header">
        <div class="cert-title">电 子 证 明</div>
        <div class="cert-no">证明编号：${certNo}</div>
    </div>
    <div class="cert-body">
        <div class="cert-content">
            兹证明 <strong>${data.userName}</strong>（身份证号：${data.userIdCard}）
            于本政务服务平台申请办理 <strong>${data.serviceItemName}</strong>（事项编码：${data.serviceItemCode}），
            相关申请材料真实有效，经审核通过，特发此证明。
        </div>
        <div class="cert-info"><label>事项名称：</label>${data.serviceItemName}</div>
        <div class="cert-info"><label>事项编码：</label>${data.serviceItemCode}</div>
        <div class="cert-info"><label>申请人：</label>${data.userName}</div>
        <div class="cert-info"><label>申请编号：</label>${data.applicationNo}</div>
        <div class="cert-info"><label>发证日期：</label>${new Date().toLocaleDateString('zh-CN')}</div>
    </div>
    <div class="cert-footer">
        <div class="cert-seal">政务服务专用章</div>
        <div class="cert-date">${new Date().toLocaleDateString('zh-CN')}</div>
    </div>
</body>
</html>`;
  }

  async findByUserId(userId: number, status?: string): Promise<Certificate[]> {
    const where: any = { userId };
    if (status) {
      where.status = status;
    }
    return this.certRepository.find({
      where,
      relations: ['serviceItem'],
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: number, userId?: number): Promise<Certificate> {
    const where: any = { id };
    if (userId) {
      where.userId = userId;
    }
    const cert = await this.certRepository.findOne({
      where,
      relations: ['user', 'application', 'serviceItem'],
    });
    if (!cert) {
      throw new Error('证明不存在');
    }
    return cert;
  }

  async findAll(params: {
    keyword?: string;
    status?: string;
    archived?: boolean;
    page?: number;
    pageSize?: number;
  }) {
    const { keyword, status, archived, page = 1, pageSize = 10 } = params;
    const where: any = {};

    if (keyword) {
      where.certificateNo = Like(`%${keyword}%`);
    }
    if (status) {
      where.status = status;
    }
    if (archived !== undefined) {
      where.archived = archived;
    }

    const [list, total] = await this.certRepository.findAndCount({
      where,
      relations: ['user', 'serviceItem'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return { list, total, page, pageSize };
  }

  async downloadCertificate(id: number, userId: number, ip?: string, userAgent?: string) {
    const cert = await this.findById(id, userId);

    await this.downloadRecordRepository.save({
      certificateId: id,
      userId,
      action: 'download',
      ipAddress: ip,
      userAgent,
    });

    return cert;
  }

  async getDownloadRecords(certificateId: number, userId?: number) {
    const where: any = { certificateId };
    if (userId) {
      where.userId = userId;
    }
    return this.downloadRecordRepository.find({
      where,
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async archiveCertificate(id: number, operatorId: number) {
    const cert = await this.certRepository.findOne({ where: { id } });
    if (!cert) {
      throw new Error('证明不存在');
    }

    cert.archived = true;
    cert.archivedAt = new Date();
    cert.archivedBy = operatorId;
    cert.status = 'archived';

    return this.certRepository.save(cert);
  }

  async unarchiveCertificate(id: number, operatorId: number) {
    const cert = await this.certRepository.findOne({ where: { id } });
    if (!cert) {
      throw new Error('证明不存在');
    }

    cert.archived = false;
    cert.archivedAt = null;
    cert.archivedBy = null;
    cert.status = 'generated';

    return this.certRepository.save(cert);
  }

  async getStatistics() {
    const total = await this.certRepository.count();
    const generated = await this.certRepository.count({ where: { status: 'generated' } });
    const archived = await this.certRepository.count({ where: { status: 'archived' } });
    const downloadCount = await this.downloadRecordRepository.count();

    return { total, generated, archived, downloadCount };
  }
}
