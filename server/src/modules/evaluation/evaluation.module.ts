import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Evaluation } from '../../entities/evaluation.entity';
import { Application } from '../../entities/application.entity';
import { ServiceItem } from '../../entities/service-item.entity';
import { Message } from '../../entities/message.entity';
import { User } from '../../entities/user.entity';
import { EvaluationController } from './evaluation.controller';
import { EvaluationService } from './evaluation.service';

@Module({
  imports: [TypeOrmModule.forFeature([Evaluation, Application, ServiceItem, Message, User])],
  controllers: [EvaluationController],
  providers: [EvaluationService],
  exports: [EvaluationService],
})
export class EvaluationModule {}
