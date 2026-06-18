import { Controller, Post, Get, Param, Body, Put, Delete, Query } from '@nestjs/common';
import { ScheduleService } from './schedule.service';

@Controller('schedules')
export class ScheduleController {
  constructor(private readonly service: ScheduleService) {}

  @Post()
  create(
    @Body() body: {
      serviceItemId: number;
      date: string;
      startTime: string;
      endTime: string;
      capacity: number;
    },
  ) {
    return this.service.create(body);
  }

  @Post('batch')
  batchCreate(
    @Body() body: {
      serviceItemId: number;
      startDate: string;
      endDate: string;
      timeSlots: { startTime: string; endTime: string; capacity: number }[];
      weekdays?: number[];
    },
  ) {
    return this.service.batchCreate(body);
  }

  @Get()
  findAll(
    @Query('serviceItemId') serviceItemId?: string,
    @Query('date') date?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('active') active?: string,
  ) {
    return this.service.findAll({
      serviceItemId: serviceItemId ? Number(serviceItemId) : undefined,
      date,
      startDate,
      endDate,
      active: active !== undefined ? active === 'true' : undefined,
    });
  }

  @Get('available/:serviceItemId')
  findAvailable(
    @Param('serviceItemId') serviceItemId: string,
    @Query('date') date?: string,
  ) {
    return this.service.findAvailableByServiceItem(Number(serviceItemId), date);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(Number(id));
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.service.update(Number(id), body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(Number(id));
  }
}
