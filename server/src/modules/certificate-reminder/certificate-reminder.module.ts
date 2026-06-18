import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CertificateReminderService } from './certificate-reminder.service';
import { CertificateReminderController } from './certificate-reminder.controller';
import { CertificateReminder } from '../../entities/certificate-reminder.entity';
import { Certificate } from '../../entities/certificate.entity';
import { Message } from '../../entities/message.entity';
import { ServiceItem } from '../../entities/service-item.entity';
import { User } from '../../entities/user.entity';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([
      CertificateReminder,
      Certificate,
      Message,
      ServiceItem,
      User,
    ]),
  ],
  controllers: [CertificateReminderController],
  providers: [CertificateReminderService],
  exports: [CertificateReminderService],
})
export class CertificateReminderModule {}
