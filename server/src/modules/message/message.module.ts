import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Message } from '../../entities/message.entity';
import { ApprovalRecord } from '../../entities/approval-record.entity';
import { Application } from '../../entities/application.entity';
import { WithdrawalRecord } from '../../entities/withdrawal-record.entity';
import { SupplementRecord } from '../../entities/supplement-record.entity';
import { User } from '../../entities/user.entity';
import { MessageController } from './message.controller';
import { MessageService } from './message.service';

@Module({
  imports: [TypeOrmModule.forFeature([Message, ApprovalRecord, Application, WithdrawalRecord, SupplementRecord, User])],
  controllers: [MessageController],
  providers: [MessageService],
  exports: [MessageService],
})
export class MessageModule {}
