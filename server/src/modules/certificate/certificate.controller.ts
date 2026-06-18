import { Controller, Get, Post, Param, Body, Query, Req, Res } from '@nestjs/common';
import { CertificateService } from './certificate.service';
import { Response, Request } from 'express';
import * as fs from 'fs';
import * as path from 'path';

@Controller('certificates')
export class CertificateController {
  constructor(private readonly service: CertificateService) {}

  @Get()
  getCertificates(
    @Query('userId') userId?: string,
    @Query('status') status?: string,
  ) {
    if (userId) {
      return this.service.findByUserId(+userId, status);
    }
    return this.service.findAll({ status });
  }

  @Get('statistics')
  getStatistics() {
    return this.service.getStatistics();
  }

  @Get('admin')
  getAdminCertificates(
    @Query('keyword') keyword?: string,
    @Query('status') status?: string,
    @Query('archived') archived?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.service.findAll({
      keyword,
      status,
      archived: archived ? archived === 'true' : undefined,
      page: page ? +page : 1,
      pageSize: pageSize ? +pageSize : 10,
    });
  }

  @Get(':id')
  getCertificate(
    @Param('id') id: string,
    @Query('userId') userId?: string,
  ) {
    return this.service.findById(+id, userId ? +userId : undefined);
  }

  @Post(':id/generate')
  generateCertificate(
    @Param('id') id: string,
    @Body() body: { operatorId: number },
  ) {
    return this.service.generateCertificate(+id, body.operatorId);
  }

  @Get(':id/download')
  async downloadCertificate(
    @Param('id') id: string,
    @Query('userId') userId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const cert = await this.service.downloadCertificate(
      +id,
      +userId,
      req.ip,
      req.headers['user-agent'],
    );

    if (cert.filePath && fs.existsSync(cert.filePath)) {
      const fileName = encodeURIComponent(`${cert.certificateNo}.html`);
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      const fileStream = fs.createReadStream(cert.filePath);
      fileStream.pipe(res);
    } else {
      res.status(404).json({ message: '证明文件不存在' });
    }
  }

  @Get(':id/preview')
  async previewCertificate(
    @Param('id') id: string,
    @Query('userId') userId: string,
    @Res() res: Response,
  ) {
    const cert = await this.service.findById(+id, +userId);

    if (cert.filePath && fs.existsSync(cert.filePath)) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      const fileStream = fs.createReadStream(cert.filePath);
      fileStream.pipe(res);
    } else {
      res.status(404).json({ message: '证明文件不存在' });
    }
  }

  @Get(':id/download-records')
  getDownloadRecords(
    @Param('id') id: string,
    @Query('userId') userId?: string,
  ) {
    return this.service.getDownloadRecords(+id, userId ? +userId : undefined);
  }

  @Post(':id/archive')
  archiveCertificate(
    @Param('id') id: string,
    @Body() body: { operatorId: number },
  ) {
    return this.service.archiveCertificate(+id, body.operatorId);
  }

  @Post(':id/unarchive')
  unarchiveCertificate(
    @Param('id') id: string,
    @Body() body: { operatorId: number },
  ) {
    return this.service.unarchiveCertificate(+id, body.operatorId);
  }
}
