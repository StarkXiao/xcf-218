import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Favorite } from '../../entities/favorite.entity';
import { ServiceItemService } from '../service-item/service-item.service';

@Injectable()
export class FavoriteService {
  constructor(
    @InjectRepository(Favorite) private readonly repository: Repository<Favorite>,
    @Inject(forwardRef(() => ServiceItemService)) private readonly serviceItemService: ServiceItemService,
  ) {}

  async toggle(userId: number, serviceItemId: number) {
    const existing = await this.repository.findOne({ where: { userId, serviceItemId } });
    let newFavorited: boolean;
    if (existing) {
      newFavorited = !existing.active;
      await this.repository.update(existing.id, { active: newFavorited });
    } else {
      newFavorited = true;
      const favorite = this.repository.create({ userId, serviceItemId, active: true });
      await this.repository.save(favorite);
    }
    await this.serviceItemService.updateCounts(serviceItemId);
    return { success: true, favorited: newFavorited };
  }

  async findByUserId(userId: number) {
    return this.repository.find({
      where: { userId, active: true },
      relations: ['serviceItem'],
      order: { createdAt: 'DESC' },
    });
  }

  async checkFavorite(userId: number, serviceItemId: number) {
    const favorite = await this.repository.findOne({ where: { userId, serviceItemId, active: true } });
    return { favorited: !!favorite };
  }

  async getFavoriteCount(serviceItemId: number) {
    return this.repository.count({ where: { serviceItemId, active: true } });
  }

  async getUserFavoriteIds(userId: number) {
    const favorites = await this.repository.find({ where: { userId, active: true }, select: ['serviceItemId'] });
    return favorites.map(f => f.serviceItemId);
  }
}
