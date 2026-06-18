import { Controller, Post, Get, Put, Param, Body, Query } from '@nestjs/common';
import { ComplaintService } from './complaint.service';

@Controller('complaints')
export class ComplaintController {
  constructor(private readonly service: ComplaintService) {}

  @Post()
  create(@Body() body: { userId: number; applicationId?: number; serviceItemId?: number; type: string; title: string; content: string }) {
    return this.service.create(body);
  }

  @Get()
  findAll(@Query('userId') userId?: string, @Query('status') status?: string, @Query('type') type?: string) {
    if (userId) return this.service.findByUserId(+userId, status);
    return this.service.findAll(status, type);
  }

  @Get('statistics')
  getStatistics() {
    return this.service.getStatistics();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(+id);
  }

  @Put(':id/handle')
  handle(
    @Param('id') id: string,
    @Body() body: { status: string; handlerId: number; handleResult: string },
  ) {
    return this.service.handle(+id, body.status, body.handlerId, body.handleResult);
  }

  @Post(':id/callbacks')
  addCallback(
    @Param('id') id: string,
    @Body() body: { adminId: number; callbackType: string; content: string; satisfaction?: number; callbackAt: string },
  ) {
    return this.service.addCallback(+id, body);
  }
}
