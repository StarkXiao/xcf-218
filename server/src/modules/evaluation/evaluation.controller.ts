import { Controller, Post, Get, Put, Param, Body, Query } from '@nestjs/common';
import { EvaluationService } from './evaluation.service';

@Controller('evaluations')
export class EvaluationController {
  constructor(private readonly service: EvaluationService) {}

  @Post()
  create(@Body() body: { userId: number; applicationId: number; serviceItemId: number; rating: number; content?: string; tags?: string; anonymous?: boolean }) {
    return this.service.create(body);
  }

  @Get()
  findAll(@Query('userId') userId?: string, @Query('serviceItemId') serviceItemId?: string) {
    if (userId) return this.service.findByUserId(+userId);
    return this.service.findAll(serviceItemId ? +serviceItemId : undefined);
  }

  @Get('statistics')
  getStatistics(@Query('serviceItemId') serviceItemId?: string) {
    return this.service.getStatistics(serviceItemId ? +serviceItemId : undefined);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(+id);
  }

  @Put(':id/reply')
  reply(@Param('id') id: string, @Body() body: { reply: string; replyBy: number }) {
    return this.service.reply(+id, body.reply, body.replyBy);
  }
}
