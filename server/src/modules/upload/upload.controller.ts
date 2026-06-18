import { Controller, Post, Get, Param, Delete, UseInterceptors, UploadedFile, UploadedFiles, Body, Res, NotFoundException, Query, Put } from '@nestjs/common';
import { FileInterceptor, AnyFilesInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';

@Controller('upload')
export class UploadController {
  constructor(private readonly service: UploadService) {}

  @Post('single')
  @UseInterceptors(FileInterceptor('file'))
  uploadSingle(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { materialName: string; required: string },
  ) {
    return {
      originalName: file.originalname,
      fileName: file.filename,
      fileSize: file.size,
      mimeType: file.mimetype,
      materialName: body.materialName,
      required: body.required === 'true',
    };
  }

  @Post('multiple')
  @UseInterceptors(AnyFilesInterceptor())
  uploadMultiple(@UploadedFiles() files: Express.Multer.File[]) {
    return files.map(file => ({
      originalName: file.originalname,
      fileName: file.filename,
      fileSize: file.size,
      mimeType: file.mimetype,
    }));
  }

  @Get('files/:applicationId')
  getFiles(@Param('applicationId') applicationId: string) {
    return this.service.findByApplicationId(+applicationId);
  }

  @Get('files-current/:applicationId')
  getCurrentFiles(@Param('applicationId') applicationId: string) {
    return this.service.findCurrentByApplicationId(+applicationId);
  }

  @Get('stats/:applicationId')
  getFileStats(@Param('applicationId') applicationId: string) {
    return this.service.getFileStats(+applicationId);
  }

  @Get('versions/:applicationId/:fieldName')
  getVersions(
    @Param('applicationId') applicationId: string,
    @Param('fieldName') fieldName: string,
  ) {
    return this.service.getVersions(+applicationId, fieldName);
  }

  @Get('compare/:applicationId/:fieldName')
  compareVersions(
    @Param('applicationId') applicationId: string,
    @Param('fieldName') fieldName: string,
    @Query('v1') v1: string,
    @Query('v2') v2: string,
  ) {
    return this.service.compareVersions(+applicationId, fieldName, +v1, +v2);
  }

  @Get('download/:id')
  async downloadFile(@Param('id') id: string, @Res() res: Response) {
    const file = await this.service.findOne(+id);
    const filePath = this.service.getFilePath(file.fileName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: '文件不存在' });
    }

    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.originalName)}"`);
    res.setHeader('Content-Type', file.mimeType);
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  }

  @Get('preview/:id')
  async previewFile(@Param('id') id: string, @Res() res: Response) {
    const file = await this.service.findOne(+id);
    const filePath = this.service.getFilePath(file.fileName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: '文件不存在' });
    }

    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  }

  @Post('reupload/:fileId')
  @UseInterceptors(FileInterceptor('file'))
  reuploadFile(
    @Param('fileId') fileId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { uploaderId: string },
  ) {
    return this.service.reuploadFile(+fileId, file, +body.uploaderId);
  }

  @Delete(':id')
  deleteFile(
    @Param('id') id: string,
    @Query('operatorId') operatorId?: string,
  ) {
    return this.service.deleteFile(+id, operatorId ? +operatorId : undefined);
  }

  @Get('proxy/:filename')
  getProxyFile(@Param('filename') filename: string, @Res() res: Response) {
    const filePath = path.join(process.cwd(), 'uploads', 'proxy', filename);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('文件不存在');
    }
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.pdf': 'application/pdf',
    };
    const mimeType = mimeTypes[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', mimeType);
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  }
}
