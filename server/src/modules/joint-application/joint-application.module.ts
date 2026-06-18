import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JointApplication } from '../../entities/joint-application.entity';
import { JointSubApplication } from '../../entities/joint-sub-application.entity';
import { JointMaterialRelation } from '../../entities/joint-material-relation.entity';
import { Application } from '../../entities/application.entity';
import { ServiceItem } from '../../entities/service-item.entity';
import { MaterialFile } from '../../entities/material-file.entity';
import { User } from '../../entities/user.entity';
import { Message } from '../../entities/message.entity';
import { ProgressRecord } from '../../entities/progress-record.entity';
import { JointApplicationController } from './joint-application.controller';
import { JointApplicationService } from './joint-application.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      JointApplication,
      JointSubApplication,
      JointMaterialRelation,
      Application,
      ServiceItem,
      MaterialFile,
      User,
      Message,
      ProgressRecord,
    ]),
  ],
  controllers: [JointApplicationController],
  providers: [JointApplicationService],
  exports: [JointApplicationService],
})
export class JointApplicationModule {}
