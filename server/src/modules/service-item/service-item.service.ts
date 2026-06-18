import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { ServiceItem } from '../../entities/service-item.entity';

@Injectable()
export class ServiceItemService {
  constructor(
    @InjectRepository(ServiceItem) private readonly repository: Repository<ServiceItem>,
  ) {}

  async findAll(keyword?: string, category?: string) {
    const where: any = { active: true };
    if (keyword) {
      where.name = Like(`%${keyword}%`);
    }
    if (category) {
      where.category = category;
    }
    return this.repository.find({ where });
  }

  async findOne(id: number) {
    return this.repository.findOne({ where: { id } });
  }

  async getCategories() {
    const items = await this.repository.find({ select: ['category'] });
    return [...new Set(items.map(i => i.category))];
  }
}
