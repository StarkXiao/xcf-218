import { Controller, Post, Get, Param, Body, Put, Query, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { ApplicationService } from './application.service';

@Controller('applications')
export class ApplicationController {
  constructor(private readonly service: ApplicationService) {}

  @Post()
  @UseInterceptors(AnyFilesInterceptor())
  create(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: {
      userId: string;
      serviceItemId: string;
      formData: string;
      materialsInfo: string;
    },
  ) {
    return this.service.create({
      userId: Number(body.userId),
      serviceItemId: Number(body.serviceItemId),
      formData: JSON.parse(body.formData),
      materialsInfo: JSON.parse(body.materialsInfo || '[]'),
      files,
    });
  }

  @Post('withdraw')
  requestWithdraw(
    @Body() body: { applicationId: number; userId: number; reason: string },
  ) {
    return this.service.requestWithdraw({
      applicationId: body.applicationId,
      userId: body.userId,
      reason: body.reason,
    });
  }

  @Post('withdraw/review')
  reviewWithdraw(
    @Body() body: {
      withdrawalId: number;
      reviewerId: number;
      status: 'approved' | 'rejected';
      comment?: string;
    },
  ) {
    return this.service.reviewWithdraw({
      withdrawalId: body.withdrawalId,
      reviewerId: body.reviewerId,
      status: body.status,
      comment: body.comment,
    });
  }

  @Post('resubmit')
  @UseInterceptors(AnyFilesInterceptor())
  resubmit(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: {
      originalApplicationId: string;
      userId: string;
      formData: string;
      materialsInfo: string;
      retainedFileIds?: string;
    },
  ) {
    return this.service.resubmit({
      originalApplicationId: Number(body.originalApplicationId),
      userId: Number(body.userId),
      formData: JSON.parse(body.formData),
      materialsInfo: JSON.parse(body.materialsInfo || '[]'),
      files,
      retainedFileIds: body.retainedFileIds ? JSON.parse(body.retainedFileIds) : [],
    });
  }

  @Get('withdrawals/pending')
  listPendingWithdrawals() {
    return this.service.listPendingWithdrawals();
  }

  @Get('withdrawals/:id')
  getWithdrawalDetail(@Param('id') id: string) {
    return this.service.getWithdrawalDetail(+id);
  }

  @Get(':id/withdrawal-records')
  getWithdrawalRecords(@Param('id') id: string) {
    return this.service.getWithdrawalRecords(+id);
  }

  @Get(':id/can-withdraw')
  canWithdraw(
    @Param('id') id: string,
    @Query('userId') userId: string,
  ) {
    return this.service.canWithdraw(+id, Number(userId));
  }

  @Get(':id/can-resubmit')
  canResubmit(
    @Param('id') id: string,
    @Query('userId') userId: string,
  ) {
    return this.service.canResubmit(+id, Number(userId));
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
