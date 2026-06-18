import { Controller, Get, Param, Put, Post, Query, Body } from '@nestjs/common';
import { MessageService } from './message.service';

@Controller('messages')
export class MessageController {
  constructor(private readonly service: MessageService) {}

  @Get()
  findByUserId(
    @Query('userId') userId: string,
    @Query('type') type?: string,
    @Query('reminderType') reminderType?: string,
  ) {
    return this.service.findByUserId(+userId, type, reminderType);
  }

  @Get('unread-count')
  getUnreadCount(@Query('userId') userId: string) {
    return this.service.getUnreadCount(+userId);
  }

  @Get('unread-reminder-count')
  getUnreadReminderCount(@Query('userId') userId: string) {
    return this.service.getUnreadReminderCount(+userId);
  }

  @Get('timeout-pending')
  getTimeoutPendingApprovals(@Query('hours') hours?: string) {
    return this.service.getTimeoutPendingApprovals(hours ? +hours : 24);
  }

  @Get('admin-todos')
  getAdminTodoAggregation() {
    return this.service.getAdminTodoAggregation();
  }

  @Put(':id/read')
  markAsRead(@Param('id') id: string) {
    return this.service.markAsRead(+id);
  }

  @Put('read-all')
  markAllAsRead(@Query('userId') userId: string) {
    return this.service.markAllAsRead(+userId);
  }

  @Post('remind-approver/:recordId')
  sendTimeoutReminder(
    @Param('recordId') recordId: string,
    @Body() body: { senderId: number },
  ) {
    return this.service.sendTimeoutReminder(+recordId, body.senderId);
  }

  @Post('status-change')
  sendStatusChangeNotification(
    @Body() body: {
      userId: number;
      applicationId: number;
      oldStatus: string;
      newStatus: string;
      applicationNo: string;
      serviceItemName?: string;
      comment?: string;
    },
  ) {
    return this.service.sendStatusChangeNotification(
      body.userId,
      body.applicationId,
      body.oldStatus,
      body.newStatus,
      body.applicationNo,
      body.serviceItemName,
      body.comment,
    );
  }
}
