import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Application } from '../../entities/application.entity';
import { ProgressRecord } from '../../entities/progress-record.entity';
import { Message } from '../../entities/message.entity';
import { ServiceItem } from '../../entities/service-item.entity';
import { User } from '../../entities/user.entity';

@Injectable()
export class ApplicationService {
  constructor(
    @InjectRepository(Application) private readonly appRepository: Repository<Application>,
    @InjectRepository(ProgressRecord) private readonly progressRepository: Repository<ProgressRecord>,
    @InjectRepository(Message) private readonly messageRepository: Repository<Message>,
    @InjectRepository(ServiceItem) private readonly itemRepository: Repository<ServiceItem>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
  ) {}

  generateApplicationNo() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `BS${y}${m}${d}${rand}`;
  }

  async create(data: {
    userId: number;
    serviceItemId: number;
    formData: any;
    materials?: any[];
  }) {
    const item = await this.itemRepository.findOne({ where: { id: data.serviceItemId } });
    if (!item) {
      throw new NotFoundException('办事事项不存在');
    }
    const user = await this.userRepository.findOne({ where: { id: data.userId } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const applicationNo = this.generateApplicationNo();
    const application = this.appRepository.create({
      applicationNo,
      userId: data.userId,
      serviceItemId: data.serviceItemId,
      formData: JSON.stringify(data.formData),
      materials: data.materials ? JSON.stringify(data.materials) : null,
      status: 'submitted',
    });

    const saved = await this.appRepository.save(application);

    await this.progressRepository.save({
      applicationId: saved.id,
      step: '提交申请',
      status: 'completed',
      remark: '用户已成功提交申请材料',
      operatorId: data.userId,
    });

    await this.messageRepository.save({
      userId: data.userId,
      title: '申请提交成功',
      content: `您的申请（编号：${applicationNo}）已成功提交，我们将尽快为您处理。事项：${item.name}`,
      type: 'application',
      applicationId: saved.id,
    });

    return this.findOne(saved.id);
  }

  async findByUserId(userId: number) {
    const apps = await this.appRepository.find({
      where: { userId },
      relations: ['serviceItem'],
      order: { createdAt: 'DESC' },
    });
    return apps.map(a => ({
      ...a,
      formData: JSON.parse(a.formData),
      materials: a.materials ? JSON.parse(a.materials) : [],
    }));
  }

  async findAll(status?: string) {
    const where: any = {};
    if (status) where.status = status;
    const apps = await this.appRepository.find({
      where,
      relations: ['user', 'serviceItem'],
      order: { createdAt: 'DESC' },
    });
    return apps.map(a => ({
      ...a,
      formData: JSON.parse(a.formData),
      materials: a.materials ? JSON.parse(a.materials) : [],
      password: undefined,
      user: a.user ? { ...a.user, password: undefined } : null,
    }));
  }

  async findOne(id: number) {
    const app = await this.appRepository.findOne({
      where: { id },
      relations: ['serviceItem', 'user', 'progressRecords'],
    });
    if (!app) throw new NotFoundException('申请不存在');
    return {
      ...app,
      formData: JSON.parse(app.formData),
      materials: app.materials ? JSON.parse(app.materials) : [],
      user: app.user ? { ...app.user, password: undefined } : null,
    };
  }

  async updateStatus(id: number, status: string, comment?: string, reviewerId?: number) {
    const app = await this.appRepository.findOne({ where: { id } });
    if (!app) throw new NotFoundException('申请不存在');

    const validStatuses = ['submitted', 'reviewing', 'approved', 'rejected', 'completed'];
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
    };

    await this.messageRepository.save({
      userId: app.userId,
      title: titleMap[status] || '申请状态更新',
      content: comment || `您的申请（编号：${app.applicationNo}）状态已更新为：${status}`,
      type: 'application',
      applicationId: id,
    });

    return this.findOne(id);
  }
}
