import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WindowHandling } from '../../entities/window-handling.entity';
import { QueueCall } from '../../entities/queue-call.entity';
import { User } from '../../entities/user.entity';
import { ServiceItem } from '../../entities/service-item.entity';
import { Application } from '../../entities/application.entity';
import { Message } from '../../entities/message.entity';
import { ProgressRecord } from '../../entities/progress-record.entity';
import { Appointment } from '../../entities/appointment.entity';
import { WindowCoordinationService } from './window-coordination.service';
import { WindowCoordinationController } from './window-coordination.controller';

@Module({
  imports: [TypeOrmModule.forFeature([WindowHandling, QueueCall, User, ServiceItem, Application, Message, ProgressRecord, Appointment])],
  controllers: [WindowCoordinationController],
  providers: [WindowCoordinationService],
  exports: [WindowCoordinationService],
})
export class WindowCoordinationModule {}
