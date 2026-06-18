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
  Logger,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
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
  private readonly logger = new Logger(JointApplicationController.name);
  constructor(private readonly service: JointApplicationService) {}

  @Get('available-items')
  async getAvailableItems() {
    return this.service.getAvailableServiceItems();
  }

  @Post()
  @UseInterceptors(
    AnyFilesInterceptor({
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
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: any,
  ) {
    this.logger.log(
      `收到联合申报提交，文件数量: ${files?.length || 0}, body keys: ${Object.keys(body).join(', ')}`,
    );
    files?.forEach(f =>
      this.logger.debug(
        `  文件: field=${f.fieldname}, name=${f.originalname}, size=${f.size}, path=${f.path}`,
      ),
    );

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
    if (files && files.length > 0) {
      for (const file of files) {
        fileList.push({ fieldName: file.fieldname, file });
      }
    }
    this.logger.log(`解析后的文件列表: ${fileList.map(f => f.fieldName).join(', ')}`);

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
