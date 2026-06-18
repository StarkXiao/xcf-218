import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MaterialFile } from '../../entities/material-file.entity';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class UploadService {
  constructor(
    @InjectRepository(MaterialFile) private readonly fileRepository: Repository<MaterialFile>,
  ) {}

  async saveFile(
    applicationId: number,
    materialName: string,
    file: Express.Multer.File,
    required: boolean,
  ) {
    const materialFile = this.fileRepository.create({
      applicationId,
      materialName,
      originalName: file.originalname,
      fileName: file.filename,
      filePath: file.path,
      fileSize: file.size,
      mimeType: file.mimetype,
      required,
    });
    return this.fileRepository.save(materialFile);
  }

  async findByApplicationId(applicationId: number) {
    return this.fileRepository.find({
      where: { applicationId },
      order: { createdAt: 'ASC' },
    });
  }

  async findOne(id: number) {
    const file = await this.fileRepository.findOne({ where: { id } });
    if (!file) {
      throw new NotFoundException('文件不存在');
    }
    return file;
  }

  async deleteFile(id: number) {
    const file = await this.findOne(id);
    if (fs.existsSync(file.filePath)) {
      fs.unlinkSync(file.filePath);
    }
    await this.fileRepository.delete(id);
    return { success: true };
  }

  getFilePath(fileName: string) {
    return path.join(process.cwd(), 'uploads', 'materials', fileName);
  }
}
