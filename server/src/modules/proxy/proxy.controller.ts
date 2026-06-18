import { Controller, Get, Post, Put, Param, Body, Query, UseInterceptors, UploadedFiles, BadRequestException } from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { ProxyService } from './proxy.service';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';

@Controller('proxy')
export class ProxyController {
  constructor(private readonly service: ProxyService) {}

  @Post('applications')
  @UseInterceptors(AnyFilesInterceptor({
    storage: diskStorage({
      destination: (req, file, cb) => {
        const uploadDir = path.join(process.cwd(), 'uploads', 'proxy');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        cb(null, `proxy-${file.fieldname}-${uniqueSuffix}${ext}`);
      },
    }),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new BadRequestException('仅支持 JPG、PNG、PDF 格式文件'), false);
      }
    },
  }))
  createApplication(
    @Body() body: {
      principalId: string;
      proxyName: string;
      proxyIdCard: string;
      proxyPhone: string;
      proxyRelation?: string;
      authorizationScope: string;
    },
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const idCardFront = files.find(f => f.fieldname === 'idCardFront');
    const idCardBack = files.find(f => f.fieldname === 'idCardBack');
    const authorizationLetter = files.find(f => f.fieldname === 'authorizationLetter');

    return this.service.createApplication({
      principalId: +body.principalId,
      proxyName: body.proxyName,
      proxyIdCard: body.proxyIdCard,
      proxyPhone: body.proxyPhone,
      proxyRelation: body.proxyRelation,
      authorizationScope: body.authorizationScope,
      idCardFrontPath: idCardFront ? idCardFront.filename : undefined,
      idCardBackPath: idCardBack ? idCardBack.filename : undefined,
      authorizationLetterPath: authorizationLetter ? authorizationLetter.filename : undefined,
    });
  }

  @Get('applications/mine')
  getMyApplications(@Query('principalId') principalId: string) {
    return this.service.findMyApplications(+principalId);
  }

  @Get('applications')
  getAllApplications(@Query('status') status?: string) {
    return this.service.findAllApplications(status);
  }

  @Get('applications/:id')
  getApplication(@Param('id') id: string) {
    return this.service.findOneApplication(+id, true);
  }

  @Post('applications/:id/review')
  reviewApplication(
    @Param('id') id: string,
    @Body() body: { action: 'approve' | 'reject' | 'reviewing'; comment: string; reviewerId: number },
  ) {
    return this.service.reviewApplication(+id, body.action, body.comment, body.reviewerId);
  }

  @Get('relations')
  getProxyRelations(@Query('principalId') principalId: string) {
    return this.service.getProxyRelations(+principalId);
  }

  @Get('relations/mine')
  getMyPrincipals(@Query('proxyId') proxyId: string) {
    return this.service.getMyPrincipals(+proxyId);
  }

  @Put('relations/:id/deactivate')
  deactivateRelation(
    @Param('id') id: string,
    @Body() body: { principalId: number },
  ) {
    return this.service.deactivateRelation(+id, body.principalId);
  }

  @Get('applications/:id/progress')
  getProgressRecords(@Param('id') id: string) {
    return this.service.getProgressRecords(+id);
  }

  @Get('statistics')
  getStatistics() {
    return this.service.getStatistics();
  }
}
