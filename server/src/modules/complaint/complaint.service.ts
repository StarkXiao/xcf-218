import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Complaint } from '../../entities/complaint.entity';
import { Callback } from '../../entities/callback.entity';
import { Application } from '../../entities/application.entity';
import { ServiceItem } from '../../entities/service-item.entity';
import { Message } from '../../entities/message.entity';

@Injectable()
export class ComplaintService {
  constructor(
    @InjectRepository(Complaint) private readonly complaintRepository: Repository<Complaint>,
    @InjectRepository(Callback) private readonly callbackRepository: Repository<Callback>,
    @InjectRepository(Application) private readonly appRepository: Repository<Application>,
    @InjectRepository(ServiceItem) private readonly itemRepository: Repository<ServiceItem>,
    @InjectRepository(Message) private readonly messageRepository: Repository<Message>,
  ) {}

  private generateComplaintNo() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `TS${y}${m}${d}${rand}`;
  }

  async create(data: { userId: number; applicationId?: number; serviceItemId?: number; type: string; title: string; content: string }) {
    if (data.applicationId) {
      const app = await this.appRepository.findOne({ where: { id: data.applicationId } });
      if (!app) throw new NotFoundException('申请不存在');
    }

    const complaintNo = this.generateComplaintNo();
    const complaint = this.complaintRepository.create({
      ...data,
      complaintNo,
      status: 'pending',
    });
    const saved = await this.complaintRepository.save(complaint);

    await this.messageRepository.save({
      userId: data.userId,
      title: '投诉提交成功',
      content: `您的投诉（编号：${complaintNo}）已提交，我们将尽快处理。`,
      type: 'application',
      applicationId: data.applicationId,
    });

    return this.findOne(saved.id);
  }

  async findByUserId(userId: number, status?: string) {
    const where: any = { userId };
    if (status) where.status = status;
    const complaints = await this.complaintRepository.find({
      where,
      relations: ['serviceItem', 'application', 'callbacks', 'callbacks.admin'],
      order: { createdAt: 'DESC' },
    });
    return complaints.map(c => this.transformComplaint(c));
  }

  async findAll(status?: string, type?: string) {
    const where: any = {};
    if (status) where.status = status;
    if (type) where.type = type;
    const complaints = await this.complaintRepository.find({
      where,
      relations: ['user', 'serviceItem', 'application', 'handler', 'callbacks', 'callbacks.admin'],
      order: { createdAt: 'DESC' },
    });
    return complaints.map(c => this.transformComplaint(c, true));
  }

  async findOne(id: number) {
    const complaint = await this.complaintRepository.findOne({
      where: { id },
      relations: ['user', 'serviceItem', 'application', 'handler', 'callbacks', 'callbacks.admin'],
    });
    if (!complaint) throw new NotFoundException('投诉不存在');
    return this.transformComplaint(complaint, true);
  }

  async handle(id: number, status: string, handlerId: number, handleResult: string) {
    const complaint = await this.complaintRepository.findOne({ where: { id } });
    if (!complaint) throw new NotFoundException('投诉不存在');

    const validStatuses = ['processing', 'resolved', 'rejected'];
    if (!validStatuses.includes(status)) throw new BadRequestException('无效的处理状态');

    complaint.status = status;
    complaint.handlerId = handlerId;
    complaint.handleResult = handleResult;
    complaint.handleAt = new Date();
    await this.complaintRepository.save(complaint);

    const statusTextMap: Record<string, string> = {
      processing: '正在处理',
      resolved: '已解决',
      rejected: '已驳回',
    };

    await this.messageRepository.save({
      userId: complaint.userId,
      title: '投诉处理进度更新',
      content: `您的投诉（编号：${complaint.complaintNo}）状态已更新为：${statusTextMap[status] || status}。${handleResult}`,
      type: 'application',
      applicationId: complaint.applicationId,
    });

    return this.findOne(id);
  }

  async addCallback(complaintId: number, data: { adminId: number; callbackType: string; content: string; satisfaction?: number; callbackAt: string }) {
    const complaint = await this.complaintRepository.findOne({ where: { id: complaintId } });
    if (!complaint) throw new NotFoundException('投诉不存在');

    const callback = this.callbackRepository.create({
      complaintId,
      adminId: data.adminId,
      callbackType: data.callbackType,
      content: data.content,
      satisfaction: data.satisfaction || null,
      callbackAt: new Date(data.callbackAt),
    });
    await this.callbackRepository.save(callback);

    if (complaint.status === 'pending') {
      complaint.status = 'processing';
      complaint.handlerId = data.adminId;
      await this.complaintRepository.save(complaint);
    }

    return this.findOne(complaintId);
  }

  async getStatistics() {
    const totalCount = await this.complaintRepository.count();
    const pendingCount = await this.complaintRepository.count({ where: { status: 'pending' } });
    const processingCount = await this.complaintRepository.count({ where: { status: 'processing' } });
    const resolvedCount = await this.complaintRepository.count({ where: { status: 'resolved' } });
    const rejectedCount = await this.complaintRepository.count({ where: { status: 'rejected' } });

    const typeDist = await this.complaintRepository
      .createQueryBuilder('c')
      .select('c.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .groupBy('c.type')
      .getRawMany();

    const typeCount: Record<string, number> = {};
    for (const row of typeDist) {
      typeCount[row.type] = parseInt(row.count);
    }

    const byServiceItem = await this.complaintRepository
      .createQueryBuilder('c')
      .leftJoin('c.serviceItem', 'si')
      .select('si.name', 'serviceItemName')
      .addSelect('c.serviceItemId', 'serviceItemId')
      .addSelect('COUNT(*)', 'count')
      .addSelect('AVG(CASE WHEN cb.satisfaction IS NOT NULL THEN cb.satisfaction ELSE NULL END)', 'avgSatisfaction')
      .leftJoin('c.callbacks', 'cb')
      .where('c.serviceItemId IS NOT NULL')
      .groupBy('c.serviceItemId')
      .getRawMany();

    const callbackCount = await this.callbackRepository.count();

    const avgSatisfactionResult = await this.callbackRepository
      .createQueryBuilder('cb')
      .select('AVG(cb.satisfaction)', 'avgSatisfaction')
      .where('cb.satisfaction IS NOT NULL')
      .getRawOne();

    const avgSatisfaction = parseFloat((avgSatisfactionResult?.avgSatisfaction || 0).toFixed(1));

    return {
      totalCount,
      pendingCount,
      processingCount,
      resolvedCount,
      rejectedCount,
      typeCount,
      byServiceItem: byServiceItem.map(item => ({
        ...item,
        count: parseInt(item.count),
        avgSatisfaction: parseFloat((parseFloat(item.avgSatisfaction) || 0).toFixed(1)),
      })),
      callbackCount,
      avgSatisfaction,
    };
  }

  private transformComplaint(complaint: Complaint, includeUser = false) {
    const result: any = { ...complaint };
    if (includeUser && complaint.user) {
      result.user = { ...complaint.user, password: undefined };
    }
    if (complaint.handler) {
      result.handler = { ...complaint.handler, password: undefined };
    }
    if (complaint.callbacks) {
      result.callbacks = complaint.callbacks.map(cb => ({
        ...cb,
        admin: cb.admin ? { ...cb.admin, password: undefined } : null,
      }));
    }
    return result;
  }
}
