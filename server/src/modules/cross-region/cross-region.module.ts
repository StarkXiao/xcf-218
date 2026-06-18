import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { CrossRegionApplication } from '../../entities/cross-region-application.entity';
import { CrossRegionDepartment } from '../../entities/cross-region-department.entity';
import { CrossRegionProgressShare } from '../../entities/cross-region-progress-share.entity';
import { CrossRegionMessageLog } from '../../entities/cross-region-message-log.entity';
import { Application } from '../../entities/application.entity';
import { ServiceItem } from '../../entities/service-item.entity';
import { User } from '../../entities/user.entity';
import { Message } from '../../entities/message.entity';
import { ProgressRecord } from '../../entities/progress-record.entity';
import { MaterialFile } from '../../entities/material-file.entity';
import { CrossRegionController } from './cross-region.controller';
import { CrossRegionService } from './cross-region.service';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CrossRegionApplication,
      CrossRegionDepartment,
      CrossRegionProgressShare,
      CrossRegionMessageLog,
      Application,
      ServiceItem,
      User,
      Message,
      ProgressRecord,
      MaterialFile,
    ]),
    MulterModule.register({
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadDir = path.join(process.cwd(), 'uploads', 'cross-region');
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }
          cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
          const timestamp = Date.now();
          const random = Math.random().toString(36).substring(2, 8);
          const ext = path.extname(file.originalname);
          cb(null, `${timestamp}-${random}${ext}`);
        },
      }),
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
      fileFilter: (req, file, cb) => {
        const allowedTypes = [
          'image/jpeg',
          'image/jpg',
          'image/png',
          'application/pdf',
        ];
        if (allowedTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('只支持 JPG/PNG/PDF 格式的文件'), false);
        }
      },
    }),
  ],
  controllers: [CrossRegionController],
  providers: [CrossRegionService],
  exports: [CrossRegionService],
})
export class CrossRegionModule {}
