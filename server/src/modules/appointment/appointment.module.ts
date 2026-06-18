import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Appointment } from '../../entities/appointment.entity';
import { Schedule } from '../../entities/schedule.entity';
import { ServiceItem } from '../../entities/service-item.entity';
import { User } from '../../entities/user.entity';
import { Message } from '../../entities/message.entity';
import { ProgressRecord } from '../../entities/progress-record.entity';
import { Application } from '../../entities/application.entity';
import { AppointmentService } from './appointment.service';
import { AppointmentController } from './appointment.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Appointment, Schedule, ServiceItem, User, Message, ProgressRecord, Application])],
  controllers: [AppointmentController],
  providers: [AppointmentService],
  exports: [AppointmentService],
})
export class AppointmentModule {}
