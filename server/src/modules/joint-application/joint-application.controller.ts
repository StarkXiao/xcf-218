import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { JointApplicationService } from './joint-application.service';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';

const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

@Controller('joint-applications')
export class JointApplicationController {
  constructor(private readonly service: JointApplicationService) {}

  @Get('available-items')
  async getAvailableItems() {
    return this.service.getAvailableServiceItems();
  }

  @Post()
  @UseInterceptors(
    FileFieldsInterceptor([], {
      storage: diskStorage({
        destination: uploadDir,
        filename: (_req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = path.extname(file.originalname);
          cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async create(
    @UploadedFiles() files: Record<string, Express.Multer.File[]>,
    @Body() body: any,
  ) {
    const userId = Number(body.userId);
    const title = body.title;
    const formData = body.formData ? JSON.parse(body.formData) : {};
    const subApplications = body.subApplications
      ? JSON.parse(body.subApplications)
      : [];

    if (!userId || !title || subApplications.length === 0) {
      throw new BadRequestException('缺少必要参数');
    }

    const fileList: Array<{ fieldName: string; file: Express.Multer.File }> =
      [];
    if (files) {
      for (const [fieldName, fileArr] of Object.entries(files)) {
        if (fileArr && fileArr.length > 0) {
          for (const file of fileArr) {
            fileList.push({ fieldName, file });
          }
        }
      }
    }

    return this.service.create({
      userId,
      title,
      formData,
      subApplications,
      files: fileList,
    });
  }

  @Get()
  async findAll(@Query('userId') userId?: string, @Query('status') status?: string) {
    if (userId) {
      return this.service.findByUserId(Number(userId));
    }
    return this.service.findAll(status);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.service.findOne(Number(id));
  }

  @Get(':id/summary')
  async getSummary(@Param('id') id: string) {
    return this.service.getApprovalSummary(Number(id));
  }

  @Get(':id/material-stats')
  async getMaterialStats(@Param('id') id: string) {
    return this.service.getMaterialReuseStats(Number(id));
  }

  @Put('sync/:applicationId')
  async syncStatus(@Param('applicationId') applicationId: string) {
    return this.service.syncSubApplicationStatus(Number(applicationId));
  }
}
