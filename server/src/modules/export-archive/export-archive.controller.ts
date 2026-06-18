import { Controller, Post, Get, Param, Body, Query, Delete, Res } from '@nestjs/common';
import { Response } from 'express';
import * as fs from 'fs';
import { ExportArchiveService } from './export-archive.service';

@Controller('export-archives')
export class ExportArchiveController {
  constructor(private readonly service: ExportArchiveService) {}

  @Post()
  createExportTask(
    @Body() body: { applicationIds: number[]; operatorId: number },
  ) {
    return this.service.createExportTask({
      applicationIds: body.applicationIds,
      operatorId: body.operatorId,
    });
  }

  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('keyword') keyword?: string,
    @Query('operatorId') operatorId?: string,
  ) {
    return this.service.findAll({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      status,
      startDate,
      endDate,
      keyword,
      operatorId: operatorId ? Number(operatorId) : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(+id);
  }

  @Get(':id/download')
  async download(
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const file = await this.service.getFilePath(+id);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.fileName)}"`);
    res.setHeader('Content-Length', file.fileSize);
    const stream = fs.createReadStream(file.filePath);
    stream.pipe(res);
  }

  @Get('application/:applicationId/data')
  getApplicationExportData(@Param('applicationId') applicationId: string) {
    return this.service.getApplicationExportData(+applicationId);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.service.delete(+id);
  }
}
