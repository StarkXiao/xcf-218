import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Certificate } from '../../entities/certificate.entity';
import { CertificateDownloadRecord } from '../../entities/certificate-download-record.entity';
import { Application } from '../../entities/application.entity';
import { Message } from '../../entities/message.entity';
import { User } from '../../entities/user.entity';
import { ServiceItem } from '../../entities/service-item.entity';
import { CertificateController } from './certificate.controller';
import { CertificateService } from './certificate.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Certificate, CertificateDownloadRecord, Application, Message, User, ServiceItem]),
  ],
  controllers: [CertificateController],
  providers: [CertificateService],
  exports: [CertificateService],
})
export class CertificateModule {}
