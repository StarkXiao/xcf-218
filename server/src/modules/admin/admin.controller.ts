import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { AdminService } from './admin.service';

@Controller('admin')
export class AdminController {
  constructor(private readonly service: AdminService) {}

  @Get('statistics')
  getStatistics() {
    return this.service.getStatistics();
  }

  @Post('applications/:id/review')
  reviewApplication(
    @Param('id') id: string,
    @Body() body: { action: 'approve' | 'reject' | 'reviewing' | 'complete'; comment: string; reviewerId: number },
  ) {
    return this.service.reviewApplication(+id, body.action, body.comment, body.reviewerId);
  }
}
