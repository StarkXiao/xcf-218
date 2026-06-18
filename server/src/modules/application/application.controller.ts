import { Controller, Post, Get, Param, Body, Put, Query } from '@nestjs/common';
import { ApplicationService } from './application.service';

@Controller('applications')
export class ApplicationController {
  constructor(private readonly service: ApplicationService) {}

  @Post()
  create(@Body() body: {
    userId: number;
    serviceItemId: number;
    formData: any;
    materials?: any[];
  }) {
    return this.service.create(body);
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
