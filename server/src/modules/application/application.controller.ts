import { Controller, Post, Get, Param, Body, Put, Query, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { ApplicationService } from './application.service';

@Controller('applications')
export class ApplicationController {
  constructor(private readonly service: ApplicationService) {}

  @Post()
  @UseInterceptors(AnyFilesInterceptor())
  create(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: {
      userId: string;
      serviceItemId: string;
      formData: string;
      materialsInfo: string;
    },
  ) {
    return this.service.create({
      userId: Number(body.userId),
      serviceItemId: Number(body.serviceItemId),
      formData: JSON.parse(body.formData),
      materialsInfo: JSON.parse(body.materialsInfo || '[]'),
      files,
    });
  }

  @Get()
  findAll(@Query('userId') userId?: string, @Query('status') status?: string) {
    if (userId) {
      return this.service.findByUserId(+userId);
    }
    return this.service.findAll(status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(+id);
  }

  @Put(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string; comment?: string; reviewerId?: number },
  ) {
    return this.service.updateStatus(+id, body.status, body.comment, body.reviewerId);
  }
}
