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
      entities: [User, ServiceItem, Application, ProgressRecord, Message, MaterialFile, Schedule, Appointment, SupplementRecord],
      synchronize: true,
      logging: false,
      charset: 'utf8mb4',
      timezone: '+08:00',
    }),
    TypeOrmModule.forFeature([User, ServiceItem, Application, ProgressRecord, Message, MaterialFile, Schedule, Appointment, SupplementRecord]),
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
    await this.seedService.seed();
  }
}
