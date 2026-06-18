import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Schedule } from '../../entities/schedule.entity';
import { ServiceItem } from '../../entities/service-item.entity';
import { ScheduleService } from './schedule.service';
import { ScheduleController } from './schedule.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Schedule, ServiceItem])],
  controllers: [ScheduleController],
  providers: [ScheduleService],
  exports: [ScheduleService],
})
export class ScheduleModule {}
