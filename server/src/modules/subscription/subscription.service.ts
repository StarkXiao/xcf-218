import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription } from '../../entities/subscription.entity';
import { Message } from '../../entities/message.entity';
import { ServiceItemService } from '../service-item/service-item.service';

@Injectable()
export class SubscriptionService {
  constructor(
    @InjectRepository(Subscription) private readonly repository: Repository<Subscription>,
    @InjectRepository(Message) private readonly messageRepository: Repository<Message>,
    @Inject(forwardRef(() => ServiceItemService)) private readonly serviceItemService: ServiceItemService,
  ) {}

  async toggle(userId: number, serviceItemId: number) {
    const existing = await this.repository.findOne({ where: { userId, serviceItemId } });
    if (existing) {
      const newActive = !existing.active;
      await this.repository.update(existing.id, { active: newActive });
      await this.serviceItemService.updateCounts(serviceItemId);
      return { success: true, subscribed: newActive };
    }
    const subscription = this.repository.create({
      userId,
      serviceItemId,
      active: true,
      notifyOnUpdate: true,
      notifyOnStatusChange: true,
    });
    await this.repository.save(subscription);
    await this.serviceItemService.updateCounts(serviceItemId);
    return { success: true, subscribed: true };
  }

  async updateSettings(userId: number, serviceItemId: number, notifyOnUpdate: boolean, notifyOnStatusChange: boolean) {
    const existing = await this.repository.findOne({ where: { userId, serviceItemId, active: true } });
    if (!existing) {
      return { success: false, message: '未订阅该事项' };
    }
    await this.repository.update(existing.id, { notifyOnUpdate, notifyOnStatusChange });
    return { success: true, notifyOnUpdate, notifyOnStatusChange };
  }

  async findByUserId(userId: number) {
    return this.repository.find({
      where: { userId, active: true },
      relations: ['serviceItem'],
      order: { createdAt: 'DESC' },
    });
  }

  async checkSubscription(userId: number, serviceItemId: number) {
    const subscription = await this.repository.findOne({ where: { userId, serviceItemId, active: true } });
    return {
      subscribed: !!subscription,
      notifyOnUpdate: subscription?.notifyOnUpdate ?? true,
      notifyOnStatusChange: subscription?.notifyOnStatusChange ?? true,
    };
  }

  async getSubscriberIds(serviceItemId: number, notifyType: 'update' | 'status') {
    const where: any = { serviceItemId, active: true };
    if (notifyType === 'update') {
      where.notifyOnUpdate = true;
    } else {
      where.notifyOnStatusChange = true;
    }
    const subscriptions = await this.repository.find({ where, select: ['userId'] });
    return subscriptions.map(s => s.userId);
  }

  async notifySubscribers(serviceItemId: number, title: string, content: string, notifyType: 'update' | 'status') {
    const subscriberIds = await this.getSubscriberIds(serviceItemId, notifyType);
    const messages = subscriberIds.map(userId =>
      this.messageRepository.create({
        userId,
        title,
        content,
        type: 'subscription',
        read: false,
        serviceItemId,
      })
    );
    if (messages.length > 0) {
      await this.messageRepository.save(messages);
    }
    return { notifiedCount: subscriberIds.length };
  }

  async getSubscriptionCount(serviceItemId: number) {
    return this.repository.count({ where: { serviceItemId, active: true } });
  }

  async getUserSubscriptionIds(userId: number) {
    const subscriptions = await this.repository.find({ where: { userId, active: true }, select: ['serviceItemId'] });
    return subscriptions.map(s => s.serviceItemId);
  }
}
