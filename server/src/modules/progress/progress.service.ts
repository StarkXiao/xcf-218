import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProgressRecord } from '../../entities/progress-record.entity';

@Injectable()
export class ProgressService {
  constructor(
    @InjectRepository(ProgressRecord) private readonly repository: Repository<ProgressRecord>,
  ) {}

  async findByApplicationId(applicationId: number) {
    return this.repository.find({
      where: { applicationId },
      order: { createdAt: 'ASC' },
    });
  }
}
