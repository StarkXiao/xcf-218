import { Controller, Post, Get, Param, Body, Put, Query, Delete } from '@nestjs/common';
import { AppointmentService } from './appointment.service';

@Controller('appointments')
export class AppointmentController {
  constructor(private readonly service: AppointmentService) {}

  @Post()
  create(
    @Body() body: {
      userId: number;
      scheduleId: number;
      remark?: string;
    },
  ) {
    return this.service.create(body);
  }

  @Get()
  findAll(
    @Query('userId') userId?: string,
    @Query('serviceItemId') serviceItemId?: string,
    @Query('date') date?: string,
    @Query('status') status?: string,
  ) {
    if (userId) {
      return this.service.findByUserId(Number(userId));
    }
    return this.service.findAll({
      serviceItemId: serviceItemId ? Number(serviceItemId) : undefined,
      date,
      status,
    });
  }

  @Get('stats')
  getStats(@Query('date') date: string) {
    return this.service.getStatsByDate(date);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(Number(id));
  }

  @Put(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string; remark?: string; operatorId?: number },
  ) {
    return this.service.updateStatus(Number(id), body.status, body.remark, body.operatorId);
  }

  @Put(':id/link-application')
  linkApplication(
    @Param('id') id: string,
    @Body() body: { applicationId: number },
  ) {
    return this.service.linkApplication(Number(id), body.applicationId);
  }

  @Post(':id/cancel')
  cancel(
    @Param('id') id: string,
    @Body() body: { userId: number; remark?: string },
  ) {
    return this.service.cancel(Number(id), body.userId, body.remark);
  }
}
