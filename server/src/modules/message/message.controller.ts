import { Controller, Get, Param, Put, Query } from '@nestjs/common';
import { MessageService } from './message.service';

@Controller('messages')
export class MessageController {
  constructor(private readonly service: MessageService) {}

  @Get()
  findByUserId(@Query('userId') userId: string) {
    return this.service.findByUserId(+userId);
  }

  @Get('unread-count')
  getUnreadCount(@Query('userId') userId: string) {
    return this.service.getUnreadCount(+userId);
  }

  @Put(':id/read')
  markAsRead(@Param('id') id: string) {
    return this.service.markAsRead(+id);
  }

  @Put('read-all')
  markAllAsRead(@Query('userId') userId: string) {
    return this.service.markAllAsRead(+userId);
  }
}
