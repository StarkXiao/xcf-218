import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { ServiceItem } from './entities/service-item.entity';
import { Application } from './entities/application.entity';
import { ProgressRecord } from './entities/progress-record.entity';
import { Message } from './entities/message.entity';
import { MaterialFile } from './entities/material-file.entity';
import { Schedule } from './entities/schedule.entity';
import { Appointment } from './entities/appointment.entity';
import { SupplementRecord } from './entities/supplement-record.entity';
import { ProxyApplication } from './entities/proxy-application.entity';
import { ProxyProgressRecord } from './entities/proxy-progress-record.entity';
import { ProxyRelation } from './entities/proxy-relation.entity';
import { Favorite } from './entities/favorite.entity';
import { Subscription } from './entities/subscription.entity';
import { Certificate } from './entities/certificate.entity';
import { CertificateDownloadRecord } from './entities/certificate-download-record.entity';
import { WindowHandling } from './entities/window-handling.entity';
import { QueueCall } from './entities/queue-call.entity';
import { ApprovalFlow } from './entities/approval-flow.entity';
import { ApprovalNode } from './entities/approval-node.entity';
import { ApprovalRecord } from './entities/approval-record.entity';
import { ApprovalComment } from './entities/approval-comment.entity';
import { ApprovalHistory } from './entities/approval-history.entity';
import { MaterialTemplate } from './entities/material-template.entity';
import { Evaluation } from './entities/evaluation.entity';
import { Complaint } from './entities/complaint.entity';
import { Callback } from './entities/callback.entity';
import { UserModule } from './modules/user/user.module';
import { ServiceItemModule } from './modules/service-item/service-item.module';
import { ApplicationModule } from './modules/application/application.module';
import { ProgressModule } from './modules/progress/progress.module';
import { MessageModule } from './modules/message/message.module';
import { AdminModule } from './modules/admin/admin.module';
import { UploadModule } from './modules/upload/upload.module';
import { ScheduleModule } from './modules/schedule/schedule.module';
import { AppointmentModule } from './modules/appointment/appointment.module';
import { SupplementCenterModule } from './modules/supplement-center/supplement-center.module';
import { ProxyModule } from './modules/proxy/proxy.module';
import { FavoriteModule } from './modules/favorite/favorite.module';
import { SubscriptionModule } from './modules/subscription/subscription.module';
import { CertificateModule } from './modules/certificate/certificate.module';
import { WindowCoordinationModule } from './modules/window-coordination/window-coordination.module';
import { ApprovalModule } from './modules/approval/approval.module';
import { MaterialTemplateModule } from './modules/material-template/material-template.module';
import { EvaluationModule } from './modules/evaluation/evaluation.module';
import { ComplaintModule } from './modules/complaint/complaint.module';
import { SeedService } from './seed.service';
import * as fs from 'fs';
import * as path from 'path';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: '127.0.0.1',
      port: 3306,
      username: 'root',
      password: 'root123456',
      database: 'government_service',
      entities: [User, ServiceItem, Application, ProgressRecord, Message, MaterialFile, Schedule, Appointment, SupplementRecord, ProxyApplication, ProxyProgressRecord, ProxyRelation, Favorite, Subscription, Certificate, CertificateDownloadRecord, WindowHandling, QueueCall, ApprovalFlow, ApprovalNode, ApprovalRecord, ApprovalComment, ApprovalHistory, MaterialTemplate, Evaluation, Complaint, Callback],
      synchronize: true,
      logging: false,
      charset: 'utf8mb4',
      timezone: '+08:00',
    }),
    TypeOrmModule.forFeature([User, ServiceItem, Application, ProgressRecord, Message, MaterialFile, Schedule, Appointment, SupplementRecord, ProxyApplication, ProxyProgressRecord, ProxyRelation, Favorite, Subscription, Certificate, CertificateDownloadRecord, WindowHandling, QueueCall, ApprovalFlow, ApprovalNode, ApprovalRecord, ApprovalComment, ApprovalHistory, MaterialTemplate, Evaluation, Complaint, Callback]),
    UserModule,
    ServiceItemModule,
    ApplicationModule,
    ProgressModule,
    MessageModule,
    AdminModule,
    UploadModule,
    ScheduleModule,
    AppointmentModule,
    SupplementCenterModule,
    ProxyModule,
    FavoriteModule,
    SubscriptionModule,
    CertificateModule,
    WindowCoordinationModule,
    ApprovalModule,
    MaterialTemplateModule,
    EvaluationModule,
    ComplaintModule,
  ],
  providers: [SeedService],
})
export class AppModule implements OnModuleInit {
  constructor(private readonly seedService: SeedService) {}

  async onModuleInit() {
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const materialsDir = path.join(uploadDir, 'materials');
    if (!fs.existsSync(materialsDir)) {
      fs.mkdirSync(materialsDir, { recursive: true });
    }
    const proxyDir = path.join(uploadDir, 'proxy');
    if (!fs.existsSync(proxyDir)) {
      fs.mkdirSync(proxyDir, { recursive: true });
    }
    const certificatesDir = path.join(uploadDir, 'certificates');
    if (!fs.existsSync(certificatesDir)) {
      fs.mkdirSync(certificatesDir, { recursive: true });
    }
    await this.seedService.seed();
  }
}
