import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { ServiceItem } from './entities/service-item.entity';
import { Application } from './entities/application.entity';
import { ProgressRecord } from './entities/progress-record.entity';
import { Message } from './entities/message.entity';
import { UserModule } from './modules/user/user.module';
import { ServiceItemModule } from './modules/service-item/service-item.module';
import { ApplicationModule } from './modules/application/application.module';
import { ProgressModule } from './modules/progress/progress.module';
import { MessageModule } from './modules/message/message.module';
import { AdminModule } from './modules/admin/admin.module';
import { SeedService } from './seed.service';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: './data/government-service.db',
      entities: [User, ServiceItem, Application, ProgressRecord, Message],
      synchronize: true,
      logging: false,
    }),
    TypeOrmModule.forFeature([User, ServiceItem, Application, ProgressRecord, Message]),
    UserModule,
    ServiceItemModule,
    ApplicationModule,
    ProgressModule,
    MessageModule,
    AdminModule,
  ],
  providers: [SeedService],
})
export class AppModule implements OnModuleInit {
  constructor(private readonly seedService: SeedService) {}

  async onModuleInit() {
    await this.seedService.seed();
  }
}
