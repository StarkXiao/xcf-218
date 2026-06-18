import { Controller, Post, Get, Param, Body, Put, Query, Delete } from '@nestjs/common';
import { WindowCoordinationService } from './window-coordination.service';

@Controller('window-coordination')
export class WindowCoordinationController {
  constructor(private readonly service: WindowCoordinationService) {}

  @Post('handlings')
  createHandling(
    @Body() body: {
      windowNumber: string;
      userId: number;
      serviceItemId: number;
      applicantName?: string;
      applicantIdCard?: string;
      applicantPhone?: string;
      formData?: string;
      materials?: string;
      handlerId?: number;
    },
  ) {
    return this.service.createHandling(body);
  }

  @Get('handlings')
  findAllHandlings(
    @Query('windowNumber') windowNumber?: string,
    @Query('serviceItemId') serviceItemId?: string,
    @Query('status') status?: string,
    @Query('date') date?: string,
    @Query('userId') userId?: string,
  ) {
    return this.service.findAllHandlings({
      windowNumber,
      serviceItemId: serviceItemId ? Number(serviceItemId) : undefined,
      status,
      date,
      userId: userId ? Number(userId) : undefined,
    });
  }

  @Get('handlings/stats')
  getHandlingStats(@Query('date') date?: string) {
    return this.service.getHandlingStats(date);
  }

  @Get('handlings/queue')
  getQueueList(
    @Query('windowNumber') windowNumber?: string,
    @Query('serviceItemId') serviceItemId?: string,
  ) {
    return this.service.getQueueList({
      windowNumber,
      serviceItemId: serviceItemId ? Number(serviceItemId) : undefined,
    });
  }

  @Get('handlings/:id')
  findOneHandling(@Param('id') id: string) {
    return this.service.findOneHandling(Number(id));
  }

  @Put('handlings/:id/status')
  updateHandlingStatus(
    @Param('id') id: string,
    @Body() body: { status: string; remark?: string; handlerId?: number },
  ) {
    return this.service.updateHandlingStatus(Number(id), body.status, body.remark, body.handlerId);
  }

  @Put('handlings/:id/sync')
  syncToOnline(
    @Param('id') id: string,
    @Body() body: { operatorId?: number },
  ) {
    return this.service.syncToOnline(Number(id), body.operatorId);
  }

  @Post('calls')
  createCall(
    @Body() body: {
      windowNumber: string;
      windowHandlingId?: number;
      queueNumber?: string;
      callerId?: number;
    },
  ) {
    return this.service.createCall(body);
  }

  @Get('calls')
  findAllCalls(
    @Query('windowNumber') windowNumber?: string,
    @Query('status') status?: string,
    @Query('date') date?: string,
  ) {
    return this.service.findAllCalls({ windowNumber, status, date });
  }

  @Get('calls/recent')
  getRecentCalls(@Query('limit') limit?: string) {
    return this.service.getRecentCalls(limit ? Number(limit) : 10);
  }

  @Get('calls/display')
  getDisplayCalls() {
    return this.service.getDisplayCalls();
  }

  @Put('calls/:id/status')
  updateCallStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    return this.service.updateCallStatus(Number(id), body.status);
  }

  @Post('calls/:id/recall')
  recallCall(
    @Param('id') id: string,
    @Body() body: { callerId?: number },
  ) {
    return this.service.recallCall(Number(id), body.callerId);
  }

  @Post('calls/next')
  callNext(
    @Body() body: {
      windowNumber: string;
      serviceItemId?: number;
      callerId?: number;
    },
  ) {
    return this.service.callNext(body);
  }
}
