import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { ServiceItem } from '../../entities/service-item.entity';
import { SubscriptionService } from '../subscription/subscription.service';
import { FavoriteService } from '../favorite/favorite.service';

@Injectable()
export class ServiceItemService {
  constructor(
    @InjectRepository(ServiceItem) private readonly repository: Repository<ServiceItem>,
    @Inject(forwardRef(() => SubscriptionService)) private readonly subscriptionService: SubscriptionService,
    @Inject(forwardRef(() => FavoriteService)) private readonly favoriteService: FavoriteService,
  ) {}

  async findAll(keyword?: string, category?: string, userId?: number) {
    const where: any = { active: true, publishStatus: 'published' };
    if (keyword) {
      where.name = Like(`%${keyword}%`);
    }
    if (category) {
      where.category = category;
    }
    const items = await this.repository.find({ where, order: { favoriteCount: 'DESC' } });
    if (userId) {
      const favoriteIds = await this.favoriteService.getUserFavoriteIds(userId);
      const subscriptionIds = await this.subscriptionService.getUserSubscriptionIds(userId);
      return items.map(item => ({
        ...item,
        isFavorited: favoriteIds.includes(item.id),
        isSubscribed: subscriptionIds.includes(item.id),
      }));
    }
    return items;
  }

  async findOne(id: number, userId?: number) {
    await this.repository.increment({ id }, 'viewCount', 1);
    const item = await this.repository.findOne({ where: { id } });
    if (userId && item) {
      const favoriteIds = await this.favoriteService.getUserFavoriteIds(userId);
      const subscriptionIds = await this.subscriptionService.getUserSubscriptionIds(userId);
      return {
        ...item,
        isFavorited: favoriteIds.includes(item.id),
        isSubscribed: subscriptionIds.includes(item.id),
      };
    }
    return item;
  }

  async getCategories() {
    const items = await this.repository.find({ select: ['category'], where: { active: true } });
    return [...new Set(items.map(i => i.category))];
  }

  async getRecommended(userId?: number, limit = 6) {
    let items = await this.repository.find({
      where: { active: true, recommended: true, publishStatus: 'published' },
      order: { favoriteCount: 'DESC' },
      take: limit * 2,
    });
    if (items.length < limit) {
      const popularItems = await this.repository.find({
        where: { active: true, publishStatus: 'published' },
        order: { favoriteCount: 'DESC', viewCount: 'DESC' },
        take: limit,
      });
      const existingIds = new Set(items.map(i => i.id));
      for (const item of popularItems) {
        if (!existingIds.has(item.id) && items.length < limit) {
          items.push(item);
          existingIds.add(item.id);
        }
      }
    }
    if (userId) {
      const favoriteIds = await this.favoriteService.getUserFavoriteIds(userId);
      const subscriptionIds = await this.subscriptionService.getUserSubscriptionIds(userId);
      return items.slice(0, limit).map(item => ({
        ...item,
        isFavorited: favoriteIds.includes(item.id),
        isSubscribed: subscriptionIds.includes(item.id),
      }));
    }
    return items.slice(0, limit);
  }

  async updateCounts(serviceItemId: number) {
    const favoriteCount = await this.favoriteService.getFavoriteCount(serviceItemId);
    const subscriptionCount = await this.subscriptionService.getSubscriptionCount(serviceItemId);
    await this.repository.update(serviceItemId, { favoriteCount, subscriptionCount });
  }

  async create(data: Partial<ServiceItem>) {
    const item = this.repository.create(data);
    return this.repository.save(item);
  }

  async update(id: number, data: Partial<ServiceItem>) {
    await this.repository.update(id, data);
    const item = await this.repository.findOne({ where: { id } });
    if (data.changeLog || data.materials || data.requirements || data.description) {
      await this.subscriptionService.notifySubscribers(
        id,
        `《${item?.name}》已更新`,
        data.changeLog || '办事指南有新的调整，请及时查看。',
        'update'
      );
    }
    return item;
  }

  async publish(id: number, adminId: number) {
    await this.repository.update(id, { publishStatus: 'published', publishedBy: adminId });
    const item = await this.repository.findOne({ where: { id } });
    if (item) {
      await this.subscriptionService.notifySubscribers(
        id,
        `《${item.name}》已发布`,
        '该事项已正式发布，您可以开始查看和办理。',
        'status'
      );
    }
    return { success: true };
  }

  async unpublish(id: number) {
    const item = await this.repository.findOne({ where: { id } });
    await this.repository.update(id, { publishStatus: 'draft' });
    if (item) {
      await this.subscriptionService.notifySubscribers(
        id,
        `《${item.name}》已下架`,
        '该事项已暂时下架，如有疑问请联系客服。',
        'status'
      );
    }
    return { success: true };
  }

  async toggleRecommend(id: number, recommended: boolean) {
    await this.repository.update(id, { recommended });
    return { success: true };
  }

  async findAllAdmin(keyword?: string, category?: string) {
    const where: any = {};
    if (keyword) {
      where.name = Like(`%${keyword}%`);
    }
    if (category) {
      where.category = category;
    }
    return this.repository.find({ where, order: { updatedAt: 'DESC' } });
  }

  async remove(id: number) {
    await this.repository.delete(id);
    return { success: true };
  }
}
