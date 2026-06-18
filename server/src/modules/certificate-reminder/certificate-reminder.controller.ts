import { Controller, Get, Post, Param, Query, Req, ParseIntPipe } from '@nestjs/common';
import { CertificateReminderService } from './certificate-reminder.service';

@Controller('certificate-reminders')
export class CertificateReminderController {
  constructor(private readonly reminderService: CertificateReminderService) {}

  @Get('my')
  async getMyReminders(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('pageSize', ParseIntPipe) pageSize: number = 10,
  ) {
    const userId = req.headers['x-user-id'] ? parseInt(req.headers['x-user-id']) : 1;
    return this.reminderService.getUserReminders(userId, { status, page, pageSize });
  }

  @Get(':id')
  async getReminderDetail(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const userId = req.headers['x-user-id'] ? parseInt(req.headers['x-user-id']) : 1;
    return this.reminderService.getReminderById(id, userId);
  }

  @Post(':id/initiate-renewal')
  async initiateRenewal(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const userId = req.headers['x-user-id'] ? parseInt(req.headers['x-user-id']) : 1;
    return this.reminderService.initiateRenewal(id, userId);
  }

  @Get(':certificateId/renewal-items')
  async getRenewalItems(@Param('certificateId', ParseIntPipe) certificateId: number) {
    return this.reminderService.getRenewalServiceItems(certificateId);
  }

  @Get('admin/expiring')
  async getExpiringCertificates(
    @Query('days', ParseIntPipe) days: number = 30,
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('pageSize', ParseIntPipe) pageSize: number = 10,
  ) {
    return this.reminderService.getExpiringCertificates({ days, page, pageSize });
  }

  @Post('admin/trigger-check')
  async triggerCheck() {
    return this.reminderService.checkExpiringCertificates();
  }

  @Get('admin/statistics')
  async getStatistics() {
    return this.reminderService.getStatistics();
  }
}
