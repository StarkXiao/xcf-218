import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Evaluation } from '../../entities/evaluation.entity';
import { Application } from '../../entities/application.entity';
import { ServiceItem } from '../../entities/service-item.entity';
import { Message } from '../../entities/message.entity';

@Injectable()
export class EvaluationService {
  constructor(
    @InjectRepository(Evaluation) private readonly evalRepository: Repository<Evaluation>,
    @InjectRepository(Application) private readonly appRepository: Repository<Application>,
    @InjectRepository(ServiceItem) private readonly itemRepository: Repository<ServiceItem>,
    @InjectRepository(Message) private readonly messageRepository: Repository<Message>,
  ) {}

  async create(data: { userId: number; applicationId: number; serviceItemId: number; rating: number; content?: string; tags?: string; anonymous?: boolean }) {
    const app = await this.appRepository.findOne({ where: { id: data.applicationId } });
    if (!app) throw new NotFoundException('申请不存在');
    if (app.status !== 'completed') throw new BadRequestException('只能对已完成的办件进行评价');
    if (app.userId !== data.userId) throw new BadRequestException('只能评价自己的办件');

    const existing = await this.evalRepository.findOne({ where: { applicationId: data.applicationId, userId: data.userId } });
    if (existing) throw new BadRequestException('该办件已评价，不可重复评价');

    if (data.rating < 1 || data.rating > 5) throw new BadRequestException('评分需在1-5之间');

    const evaluation = this.evalRepository.create({
      ...data,
      tags: data.tags || null,
      content: data.content || null,
      anonymous: data.anonymous !== undefined ? data.anonymous : false,
    });
    const saved = await this.evalRepository.save(evaluation);

    await this.messageRepository.save({
      userId: data.userId,
      title: '评价提交成功',
      content: `您对办件（编号：${app.applicationNo}）的评价已提交，感谢您的反馈！`,
      type: 'application',
      applicationId: data.applicationId,
    });

    return this.findOne(saved.id);
  }

  async findByUserId(userId: number) {
    const evaluations = await this.evalRepository.find({
      where: { userId },
      relations: ['serviceItem', 'application', 'replyUser'],
      order: { createdAt: 'DESC' },
    });
    return evaluations.map(e => this.transformEvaluation(e));
  }

  async findAll(serviceItemId?: number) {
    const where: any = {};
    if (serviceItemId) where.serviceItemId = serviceItemId;
    const evaluations = await this.evalRepository.find({
      where,
      relations: ['user', 'serviceItem', 'application', 'replyUser'],
      order: { createdAt: 'DESC' },
    });
    return evaluations.map(e => this.transformEvaluation(e, true));
  }

  async findOne(id: number) {
    const evaluation = await this.evalRepository.findOne({
      where: { id },
      relations: ['user', 'serviceItem', 'application', 'replyUser'],
    });
    if (!evaluation) throw new NotFoundException('评价不存在');
    return this.transformEvaluation(evaluation, true);
  }

  async reply(id: number, reply: string, replyBy: number) {
    const evaluation = await this.evalRepository.findOne({ where: { id } });
    if (!evaluation) throw new NotFoundException('评价不存在');
    if (evaluation.reply) throw new BadRequestException('该评价已回复');

    evaluation.reply = reply;
    evaluation.replyBy = replyBy;
    evaluation.replyAt = new Date();
    await this.evalRepository.save(evaluation);

    await this.messageRepository.save({
      userId: evaluation.userId,
      title: '评价回复通知',
      content: `您提交的评价已收到回复，请查看详情。`,
      type: 'application',
      applicationId: evaluation.applicationId,
    });

    return this.findOne(id);
  }

  async getStatistics(serviceItemId?: number) {
    const qb = this.evalRepository.createQueryBuilder('e');

    if (serviceItemId) {
      qb.where('e.serviceItemId = :serviceItemId', { serviceItemId });
    }

    const totalCount = await qb.getCount();

    const avgResult = await this.evalRepository
      .createQueryBuilder('e')
      .select('AVG(e.rating)', 'avgRating')
      .getRawOne();
    const avgRating = parseFloat((avgResult?.avgRating || 0).toFixed(1));

    const ratingDist = await this.evalRepository
      .createQueryBuilder('e')
      .select('e.rating', 'rating')
      .addSelect('COUNT(*)', 'count')
      .groupBy('e.rating')
      .getRawMany();

    const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const row of ratingDist) {
      ratingDistribution[row.rating] = parseInt(row.count);
    }

    const tagQb = this.evalRepository
      .createQueryBuilder('e')
      .select('e.tags', 'tags')
      .where('e.tags IS NOT NULL');
    if (serviceItemId) {
      tagQb.andWhere('e.serviceItemId = :serviceItemId', { serviceItemId });
    }
    const tagRows = await tagQb.getRawMany();
    const tagCount: Record<string, number> = {};
    for (const row of tagRows) {
      if (row.tags) {
        try {
          const tags = JSON.parse(row.tags);
          for (const tag of tags) {
            tagCount[tag] = (tagCount[tag] || 0) + 1;
          }
        } catch {}
      }
    }

    const serviceItemQb = this.evalRepository
      .createQueryBuilder('e')
      .leftJoin('e.serviceItem', 'si')
      .select('si.name', 'serviceItemName')
      .addSelect('e.serviceItemId', 'serviceItemId')
      .addSelect('AVG(e.rating)', 'avgRating')
      .addSelect('COUNT(*)', 'count')
      .groupBy('e.serviceItemId');
    if (serviceItemId) {
      serviceItemQb.where('e.serviceItemId = :serviceItemId', { serviceItemId });
    }
    const byServiceItem = await serviceItemQb.getRawMany();

    const recentQb = this.evalRepository
      .createQueryBuilder('e')
      .leftJoin('e.user', 'u')
      .leftJoin('e.serviceItem', 'si')
      .select('e.id', 'id')
      .addSelect('e.rating', 'rating')
      .addSelect('e.content', 'content')
      .addSelect('e.anonymous', 'anonymous')
      .addSelect('u.name', 'userName')
      .addSelect('si.name', 'serviceItemName')
      .addSelect('e.createdAt', 'createdAt')
      .orderBy('e.createdAt', 'DESC')
      .limit(10);
    if (serviceItemId) {
      recentQb.where('e.serviceItemId = :serviceItemId', { serviceItemId });
    }
    const recentEvaluations = await recentQb.getRawMany();

    return {
      totalCount,
      avgRating,
      ratingDistribution,
      tagCount,
      byServiceItem: byServiceItem.map(item => ({
        ...item,
        avgRating: parseFloat((parseFloat(item.avgRating) || 0).toFixed(1)),
        count: parseInt(item.count),
      })),
      recentEvaluations,
    };
  }

  private transformEvaluation(evaluation: Evaluation, includeUser = false) {
    const result: any = {
      ...evaluation,
      tags: evaluation.tags ? JSON.parse(evaluation.tags) : [],
    };
    if (includeUser && evaluation.user) {
      if (evaluation.anonymous) {
        result.user = { name: '匿名用户' };
      } else {
        result.user = { ...evaluation.user, password: undefined };
      }
    }
    if (evaluation.replyUser) {
      result.replyUser = { ...evaluation.replyUser, password: undefined };
    }
    return result;
  }
}
