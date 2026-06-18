import { Controller, Post, Get, Param, Delete, UseInterceptors, UploadedFile, UploadedFiles, Body, Res, NotFoundException } from '@nestjs/common';
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
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  }

  @Delete(':id')
  deleteFile(@Param('id') id: string) {
    return this.service.deleteFile(+id);
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
