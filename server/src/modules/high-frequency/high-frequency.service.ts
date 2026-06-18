import { Injectable, Inject, forwardRef, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HotItem } from '../../entities/hot-item.entity';
import { HotCategory } from '../../entities/hot-category.entity';
import { ServiceItem } from '../../entities/service-item.entity';
import { Application } from '../../entities/application.entity';
import { FavoriteService } from '../favorite/favorite.service';
import { SubscriptionService } from '../subscription/subscription.service';

@Injectable()
export class HighFrequencyService {
  constructor(
    @InjectRepository(HotItem) private readonly hotItemRepository: Repository<HotItem>,
    @InjectRepository(HotCategory) private readonly hotCategoryRepository: Repository<HotCategory>,
    @InjectRepository(ServiceItem) private readonly serviceItemRepository: Repository<ServiceItem>,
    @InjectRepository(Application) private readonly applicationRepository: Repository<Application>,
    @Inject(forwardRef(() => FavoriteService)) private readonly favoriteService: FavoriteService,
    @Inject(forwardRef(() => SubscriptionService)) private readonly subscriptionService: SubscriptionService,
  ) {}

  async getHotItems(userId?: number) {
    const items = await this.hotItemRepository.find({
      where: { active: true },
      relations: ['serviceItem', 'category'],
      order: { sort: 'ASC', createdAt: 'DESC' },
    });
    return this.enrichWithUserInfo(items, userId);
  }

  async getBanners(userId?: number) {
    const items = await this.hotItemRepository.find({
      where: { active: true, isBanner: true },
      relations: ['serviceItem', 'category'],
      order: { sort: 'ASC', createdAt: 'DESC' },
    });
    return this.enrichWithUserInfo(items, userId);
  }

  async getQuickApplyItems(userId?: number) {
    const items = await this.hotItemRepository.find({
      where: { active: true, isQuickApply: true },
      relations: ['serviceItem', 'category'],
      order: { sort: 'ASC', createdAt: 'DESC' },
    });
    return this.enrichWithUserInfo(items, userId);
  }

  async getHotCategories() {
    const categories = await this.hotCategoryRepository.find({
      where: { active: true },
      relations: ['hotItems', 'hotItems.serviceItem'],
      order: { sort: 'ASC' },
    });
    return categories.map(cat => ({
      ...cat,
      hotItems: cat.hotItems.filter(item => item.active),
    }));
  }

  async getItemsByCategory(categoryId: number, userId?: number) {
    const items = await this.hotItemRepository.find({
      where: { active: true, categoryId },
      relations: ['serviceItem', 'category'],
      order: { sort: 'ASC', createdAt: 'DESC' },
    });
    return this.enrichWithUserInfo(items, userId);
  }

  async getHotRanking(limit = 10, userId?: number) {
    const items = await this.serviceItemRepository.find({
      where: { active: true, publishStatus: 'published' },
      order: {
        applicationCount: 'DESC',
        favoriteCount: 'DESC',
        viewCount: 'DESC',
      },
      take: limit,
    });
    if (userId) {
      const favoriteIds = await this.favoriteService.getUserFavoriteIds(userId);
      const subscriptionIds = await this.subscriptionService.getUserSubscriptionIds(userId);
      return items.map((item, index) => ({
        ...item,
        rank: index + 1,
        isFavorited: favoriteIds.includes(item.id),
        isSubscribed: subscriptionIds.includes(item.id),
      }));
    }
    return items.map((item, index) => ({
      ...item,
      rank: index + 1,
    }));
  }

  async getHeatStatistics(serviceItemId: number) {
    const [totalApplications, totalFavorites, totalSubscriptions, totalViews, totalClicks] = await Promise.all([
      this.applicationRepository.count({ where: { serviceItemId } }),
      this.favoriteService.getFavoriteCount(serviceItemId),
      this.subscriptionService.getSubscriptionCount(serviceItemId),
      this.serviceItemRepository.findOne({ where: { id: serviceItemId }, select: ['viewCount'] }),
      this.hotItemRepository.sum('clickCount', { serviceItemId }),
    ]);

    return {
      totalApplications,
      totalFavorites,
      totalSubscriptions,
      totalViews: totalViews?.viewCount || 0,
      totalClicks: totalClicks || 0,
      heatScore: this.calculateHeatScore(totalApplications, totalFavorites, totalSubscriptions, totalViews?.viewCount || 0, totalClicks || 0),
    };
  }

  async incrementClickCount(hotItemId: number) {
    await this.hotItemRepository.increment({ id: hotItemId }, 'clickCount', 1);
    return { success: true };
  }

  private calculateHeatScore(applications: number, favorites: number, subscriptions: number, views: number, clicks: number = 0): number {
    return Math.round(applications * 10 + favorites * 5 + subscriptions * 3 + views * 0.1 + clicks * 2);
  }

  private async enrichWithUserInfo(items: HotItem[], userId?: number) {
    if (!userId) return items;
    const favoriteIds = await this.favoriteService.getUserFavoriteIds(userId);
    const subscriptionIds = await this.subscriptionService.getUserSubscriptionIds(userId);
    return items.map(item => ({
      ...item,
      serviceItem: item.serviceItem ? {
        ...item.serviceItem,
        isFavorited: favoriteIds.includes(item.serviceItemId),
        isSubscribed: subscriptionIds.includes(item.serviceItemId),
      } : null,
    }));
  }

  async findAllCategories() {
    return this.hotCategoryRepository.find({
      order: { sort: 'ASC', createdAt: 'DESC' },
    });
  }

  async findAllItems(keyword?: string, categoryId?: number) {
    const where: any = {};
    if (categoryId) where.categoryId = categoryId;
    const items = await this.hotItemRepository.find({
      where,
      relations: ['serviceItem', 'category'],
      order: { sort: 'ASC', createdAt: 'DESC' },
    });
    if (keyword) {
      return items.filter(item =>
        item.serviceItem?.name.includes(keyword) ||
        item.bannerTitle?.includes(keyword)
      );
    }
    return items;
  }

  async createCategory(data: Partial<HotCategory>) {
    const category = this.hotCategoryRepository.create(data);
    return this.hotCategoryRepository.save(category);
  }

  async updateCategory(id: number, data: Partial<HotCategory>) {
    await this.hotCategoryRepository.update(id, data);
    return this.hotCategoryRepository.findOne({ where: { id } });
  }

  async deleteCategory(id: number) {
    await this.hotItemRepository.update({ categoryId: id }, { categoryId: null });
    await this.hotCategoryRepository.delete(id);
    return { success: true };
  }

  async createItem(data: Partial<HotItem>) {
    const item = this.hotItemRepository.create(data);
    return this.hotItemRepository.save(item);
  }

  async updateItem(id: number, data: Partial<HotItem>) {
    await this.hotItemRepository.update(id, data);
    return this.hotItemRepository.findOne({ where: { id }, relations: ['serviceItem', 'category'] });
  }

  async deleteItem(id: number) {
    await this.hotItemRepository.delete(id);
    return { success: true };
  }

  async toggleItemActive(id: number, active: boolean) {
    await this.hotItemRepository.update(id, { active });
    return { success: true };
  }

  async updateItemSort(id: number, sort: number) {
    await this.hotItemRepository.update(id, { sort });
    return { success: true };
  }

  async getAvailableServiceItems() {
    return this.serviceItemRepository.find({
      where: { active: true, publishStatus: 'published' },
      order: { name: 'ASC' },
    });
  }

  async getItemById(id: number) {
    const item = await this.hotItemRepository.findOne({
      where: { id },
      relations: ['serviceItem', 'category'],
    });
    if (!item) throw new NotFoundException('高频事项不存在');
    return item;
  }

  async getCategoryById(id: number) {
    const category = await this.hotCategoryRepository.findOne({ where: { id } });
    if (!category) throw new NotFoundException('高频分类不存在');
    return category;
  }
}
