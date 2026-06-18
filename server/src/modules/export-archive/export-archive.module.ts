import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExportArchive } from '../../entities/export-archive.entity';
import { Application } from '../../entities/application.entity';
import { ApprovalRecord } from '../../entities/approval-record.entity';
import { ApprovalHistory } from '../../entities/approval-history.entity';
import { ProgressRecord } from '../../entities/progress-record.entity';
import { MaterialFile } from '../../entities/material-file.entity';
import { User } from '../../entities/user.entity';
import { ServiceItem } from '../../entities/service-item.entity';
import { ExportArchiveService } from './export-archive.service';
import { ExportArchiveController } from './export-archive.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ExportArchive,
      Application,
      ApprovalRecord,
      ApprovalHistory,
      ProgressRecord,
      MaterialFile,
      User,
      ServiceItem,
    ]),
  ],
  providers: [ExportArchiveService],
  controllers: [ExportArchiveController],
  exports: [ExportArchiveService],
})
export class ExportArchiveModule {}
