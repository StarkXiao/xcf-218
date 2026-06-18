import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, LessThan, Between, IsNull, Not } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as dayjs from 'dayjs';
import { CertificateReminder } from '../../entities/certificate-reminder.entity';
import { Certificate } from '../../entities/certificate.entity';
import { Message } from '../../entities/message.entity';
import { ServiceItem } from '../../entities/service-item.entity';
import { User } from '../../entities/user.entity';

@Injectable()
export class CertificateReminderService {
  private readonly logger = new Logger(CertificateReminderService.name);

  private readonly reminderLevels = [
    { days: 30, type: 'advance', urgency: 'low' },
    { days: 15, type: 'reminder', urgency: 'medium' },
    { days: 7, type: 'urgent', urgency: 'high' },
    { days: 1, type: 'critical', urgency: 'critical' },
    { days: 0, type: 'expired', urgency: 'expired' },
  ];

  constructor(
    @InjectRepository(CertificateReminder)
    private readonly reminderRepository: Repository<CertificateReminder>,
    @InjectRepository(Certificate)
    private readonly certificateRepository: Repository<Certificate>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(ServiceItem)
    private readonly serviceItemRepository: Repository<ServiceItem>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM, {
    name: 'check-expiring-certificates',
    timeZone: 'Asia/Shanghai',
  })
  async handleCron() {
    this.logger.log('开始执行证照到期提醒定时任务');
    try {
      const result = await this.checkExpiringCertificates();
      this.logger.log(`证照到期提醒任务完成：扫描${result.scanned}个证照，发送${result.notified}条提醒`);
    } catch (error) {
      this.logger.error('证照到期提醒任务执行失败', error);
    }
  }

  async checkExpiringCertificates() {
    const now = dayjs();
    const endDate = now.add(30, 'day').toDate();
    
    const certificates = await this.certificateRepository.find({
      where: {
        expiredAt: Not(IsNull()),
        status: 'generated',
        archived: false,
      },
      relations: ['user', 'serviceItem'],
    });

    let scanned = 0;
    let notified = 0;

    for (const cert of certificates) {
      if (!cert.expiredAt) continue;
      
      scanned++;
      const expiredAt = dayjs(cert.expiredAt);
      const daysToExpiry = expiredAt.diff(now, 'day');

      for (const level of this.reminderLevels) {
        if (daysToExpiry <= level.days && daysToExpiry > (level.days - 1)) {
          const existingReminder = await this.reminderRepository.findOne({
            where: {
              certificateId: cert.id,
              reminderType: level.type,
              daysBeforeExpiry: level.days,
            },
          });

          if (!existingReminder) {
            await this.createAndSendReminder(cert, level, daysToExpiry);
            notified++;
          }
          break;
        }
      }

      if (daysToExpiry < 0 && !cert.archived) {
        const existingExpiredReminder = await this.reminderRepository.findOne({
          where: {
            certificateId: cert.id,
            reminderType: 'expired',
          },
        });
        if (!existingExpiredReminder) {
          await this.createAndSendReminder(cert, this.reminderLevels[4], daysToExpiry);
          notified++;
        }
      }
    }

    return { scanned, notified };
  }

  private async createAndSendReminder(
    cert: Certificate,
    level: { days: number; type: string; urgency: string },
    daysToExpiry: number,
  ) {
    const renewalServiceItem = await this.matchRenewalServiceItem(cert);

    const reminder = this.reminderRepository.create({
      userId: cert.userId,
      certificateId: cert.id,
      serviceItemId: renewalServiceItem?.id,
      expiredAt: cert.expiredAt,
      reminderType: level.type,
      daysBeforeExpiry: level.days,
    });

    const savedReminder = await this.reminderRepository.save(reminder);

    const message = await this.sendReminderMessage(cert, level, daysToExpiry, renewalServiceItem);
    
    savedReminder.notified = true;
    savedReminder.notifiedAt = new Date();
    savedReminder.messageId = message.id;
    await this.reminderRepository.save(savedReminder);

    return savedReminder;
  }

  async matchRenewalServiceItem(cert: Certificate): Promise<ServiceItem | null> {
    const originalServiceItem = cert.serviceItem;
    if (!originalServiceItem) return null;

    let renewalItem = await this.serviceItemRepository.findOne({
      where: {
        code: `${originalServiceItem.code}_RENEW`,
        active: true,
        publishStatus: 'published',
      },
    });

    if (!renewalItem) {
      renewalItem = await this.serviceItemRepository.findOne({
        where: {
          category: originalServiceItem.category,
          active: true,
          publishStatus: 'published',
        },
        order: { createdAt: 'DESC' },
      });
    }

    if (!renewalItem) {
      renewalItem = originalServiceItem;
    }

    return renewalItem;
  }

  private async sendReminderMessage(
    cert: Certificate,
    level: { days: number; type: string; urgency: string },
    daysToExpiry: number,
    renewalServiceItem?: ServiceItem | null,
  ) {
    const urgencyLabels = {
      low: '温馨提示',
      medium: '提醒',
      high: '紧急提醒',
      critical: '特别提醒',
      expired: '已过期',
    };

    const urgencyLabel = urgencyLabels[level.urgency] || '提醒';
    const certData = JSON.parse(cert.certificateData || '{}');
    const certName = certData.serviceItemName || cert.certificateType || '证照';

    let title: string;
    let content: string;

    if (daysToExpiry >= 0) {
      title = `【${urgencyLabel}】您的${certName}将在${daysToExpiry}天后到期`;
      content = `尊敬的${cert.user?.name || '用户'}：\n\n您持有的${certName}（证照编号：${cert.certificateNo}）将于${dayjs(cert.expiredAt).format('YYYY年MM月DD日')}到期，请及时办理续期手续，避免影响您的正常使用。`;
    } else {
      title = `【已过期】您的${certName}已过期${Math.abs(daysToExpiry)}天`;
      content = `尊敬的${cert.user?.name || '用户'}：\n\n您持有的${certName}（证照编号：${cert.certificateNo}）已于${dayjs(cert.expiredAt).format('YYYY年MM月DD日')}过期，请尽快办理续期手续。`;
    }

    if (renewalServiceItem) {
      content += `\n\n可续办事项：${renewalServiceItem.name}\n请点击消息或前往"我的证照"办理续期。`;
    }

    const message = this.messageRepository.create({
      userId: cert.userId,
      title,
      content,
      type: 'certificate-reminder',
      serviceItemId: renewalServiceItem?.id,
    });

    return this.messageRepository.save(message);
  }

  async getUserReminders(userId: number, params?: {
    status?: string;
    page?: number;
    pageSize?: number;
  }) {
    const { status, page = 1, pageSize = 10 } = params || {};
    const where: any = { userId };

    if (status === 'pending') {
      where.renewalInitiated = false;
    } else if (status === 'completed') {
      where.renewalInitiated = true;
    }

    const [list, total] = await this.reminderRepository.findAndCount({
      where,
      relations: ['certificate', 'serviceItem'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return { list, total, page, pageSize };
  }

  async getReminderById(id: number, userId?: number) {
    const where: any = { id };
    if (userId) {
      where.userId = userId;
    }
    return this.reminderRepository.findOne({
      where,
      relations: ['certificate', 'serviceItem', 'user'],
    });
  }

  async getExpiringCertificates(params?: {
    days?: number;
    page?: number;
    pageSize?: number;
  }) {
    const { days = 30, page = 1, pageSize = 10 } = params || {};
    const now = new Date();
    const endDate = dayjs().add(days, 'day').toDate();

    const [list, total] = await this.certificateRepository.findAndCount({
      where: {
        expiredAt: Between(now, endDate),
        status: 'generated',
        archived: false,
      },
      relations: ['user', 'serviceItem'],
      order: { expiredAt: 'ASC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    const result = list.map(cert => {
      const expiredAt = dayjs(cert.expiredAt);
      const daysToExpiry = expiredAt.diff(dayjs(), 'day');
      let urgency = 'low';
      if (daysToExpiry <= 0) urgency = 'expired';
      else if (daysToExpiry <= 1) urgency = 'critical';
      else if (daysToExpiry <= 7) urgency = 'high';
      else if (daysToExpiry <= 15) urgency = 'medium';

      return {
        ...cert,
        daysToExpiry,
        urgency,
      };
    });

    return { list: result, total, page, pageSize };
  }

  async initiateRenewal(reminderId: number, userId: number) {
    const reminder = await this.getReminderById(reminderId, userId);
    if (!reminder) {
      throw new Error('提醒记录不存在');
    }

    if (reminder.renewalInitiated) {
      return {
        success: true,
        alreadyInitiated: true,
        reminder,
      };
    }

    reminder.renewalInitiated = true;
    reminder.renewalInitiatedAt = new Date();
    await this.reminderRepository.save(reminder);

    return {
      success: true,
      alreadyInitiated: false,
      reminder,
    };
  }

  async getRenewalServiceItems(certificateId: number) {
    const cert = await this.certificateRepository.findOne({
      where: { id: certificateId },
      relations: ['serviceItem'],
    });

    if (!cert) {
      throw new Error('证照不存在');
    }

    const primaryItem = await this.matchRenewalServiceItem(cert);

    const relatedItems = await this.serviceItemRepository.find({
      where: {
        category: cert.serviceItem?.category,
        active: true,
        publishStatus: 'published',
      },
      take: 5,
    });

    return {
      primary: primaryItem,
      related: relatedItems.filter(item => item.id !== primaryItem?.id),
      certificate: cert,
    };
  }

  async getStatistics() {
    const totalReminders = await this.reminderRepository.count();
    const pendingRenewal = await this.reminderRepository.count({
      where: { renewalInitiated: false },
    });
    const completedRenewal = await this.reminderRepository.count({
      where: { renewalInitiated: true },
    });

    const now = new Date();
    const thirtyDaysLater = dayjs().add(30, 'day').toDate();
    const expiringCount = await this.certificateRepository.count({
      where: {
        expiredAt: Between(now, thirtyDaysLater),
        status: 'generated',
        archived: false,
      },
    });

    const expiredCount = await this.certificateRepository.count({
      where: {
        expiredAt: LessThan(now),
        status: 'generated',
        archived: false,
      },
    });

    return {
      totalReminders,
      pendingRenewal,
      completedRenewal,
      expiringCount,
      expiredCount,
    };
  }
}
