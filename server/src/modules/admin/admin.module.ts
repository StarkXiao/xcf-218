import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Application } from '../../entities/application.entity';
import { ProgressRecord } from '../../entities/progress-record.entity';
import { Message } from '../../entities/message.entity';
import { ServiceItem } from '../../entities/service-item.entity';
import { User } from '../../entities/user.entity';
import { Certificate } from '../../entities/certificate.entity';
import { CertificateDownloadRecord } from '../../entities/certificate-download-record.entity';
import { ApprovalRecord } from '../../entities/approval-record.entity';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { CertificateService } from '../certificate/certificate.service';

@Module({
  imports: [TypeOrmModule.forFeature([Application, ProgressRecord, Message, ServiceItem, User, Certificate, CertificateDownloadRecord, ApprovalRecord])],
  controllers: [AdminController],
  providers: [AdminService, CertificateService],
  exports: [AdminService],
})
export class AdminModule {}
