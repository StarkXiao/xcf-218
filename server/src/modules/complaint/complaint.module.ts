import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Complaint } from '../../entities/complaint.entity';
import { Callback } from '../../entities/callback.entity';
import { Application } from '../../entities/application.entity';
import { ServiceItem } from '../../entities/service-item.entity';
import { Message } from '../../entities/message.entity';
import { User } from '../../entities/user.entity';
import { ComplaintController } from './complaint.controller';
import { ComplaintService } from './complaint.service';

@Module({
  imports: [TypeOrmModule.forFeature([Complaint, Callback, Application, ServiceItem, Message, User])],
  controllers: [ComplaintController],
  providers: [ComplaintService],
  exports: [ComplaintService],
})
export class ComplaintModule {}
