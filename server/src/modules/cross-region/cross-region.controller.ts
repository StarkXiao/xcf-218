import { Controller, Post, Get, Put, Param, Body, Query, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { CrossRegionService } from './cross-region.service';

@Controller('cross-region')
export class CrossRegionController {
  constructor(private readonly service: CrossRegionService) {}

  @Get('departments')
  getDepartments() {
    return this.service.getDepartments();
  }

  @Get('check-jurisdiction')
  checkJurisdiction(
    @Query('serviceItemId') serviceItemId: string,
    @Query('applicantLocation') applicantLocation: string,
  ) {
    return this.service.checkJurisdiction(+serviceItemId, applicantLocation);
  }

  @Post()
  @UseInterceptors(AnyFilesInterceptor())
  create(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: {
      userId: string;
      serviceItemId: string;
      localDepartmentId: string;
      remoteDepartmentId: string;
      applicantLocation: string;
      formData: string;
      materialsInfo: string;
    },
  ) {
    return this.service.create({
      userId: Number(body.userId),
      serviceItemId: Number(body.serviceItemId),
      localDepartmentId: Number(body.localDepartmentId),
      remoteDepartmentId: Number(body.remoteDepartmentId),
      applicantLocation: body.applicantLocation,
      formData: JSON.parse(body.formData),
      materialsInfo: JSON.parse(body.materialsInfo || '[]'),
      files,
    });
  }

  @Post('verify-jurisdiction')
  verifyJurisdiction(
    @Body() body: {
      crossRegionApplicationId: number;
      verifierId: number;
      passed: boolean;
      reason?: string;
    },
  ) {
    return this.service.verifyJurisdiction({
      crossRegionApplicationId: body.crossRegionApplicationId,
      verifierId: body.verifierId,
      passed: body.passed,
      reason: body.reason,
    });
  }

  @Post('switch-department')
  switchDepartment(
    @Body() body: {
      crossRegionApplicationId: number;
      operatorId: number;
      targetHandler: 'local' | 'remote';
      reason: string;
    },
  ) {
    return this.service.switchDepartment({
      crossRegionApplicationId: body.crossRegionApplicationId,
      operatorId: body.operatorId,
      targetHandler: body.targetHandler,
      reason: body.reason,
    });
  }

  @Put(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string; comment?: string; operatorId?: number },
  ) {
    return this.service.updateStatus({
      crossRegionApplicationId: +id,
      status: body.status,
      comment: body.comment,
      operatorId: body.operatorId,
    });
  }

  @Get(':id/progress')
  getProgressShares(
    @Param('id') id: string,
    @Query('viewerRole') viewerRole: string,
  ) {
    return this.service.getProgressShares(+id, viewerRole || 'all');
  }

  @Get(':id/message-logs')
  getMessageLogs(@Param('id') id: string) {
    return this.service.getMessageLogs(+id);
  }

  @Get('statistics')
  getStatistics() {
    return this.service.getStatistics();
  }

  @Get('my')
  findByUserId(@Query('userId') userId: string) {
    return this.service.findByUserId(+userId);
  }

  @Get()
  findAll(
    @Query('status') status?: string,
    @Query('currentHandler') currentHandler?: string,
  ) {
    return this.service.findAll({ status, currentHandler });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(+id);
  }
}
