import { Controller, Get, Post, Put, Param, Body, Query, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SupplementCenterService } from './supplement-center.service';

@Controller('supplement-center')
export class SupplementCenterController {
  constructor(private readonly service: SupplementCenterService) {}

  @Post('reject')
  rejectMaterials(
    @Body() body: {
      applicationId: number;
      operatorId: number;
      rejectReason: string;
      rejectedMaterials: Array<{ fieldName: string; materialName: string; reason: string }>;
    },
  ) {
    return this.service.rejectMaterials({
      applicationId: body.applicationId,
      operatorId: body.operatorId,
      rejectReason: body.rejectReason,
      rejectedMaterials: body.rejectedMaterials,
    });
  }

  @Get('user')
  getUserSupplementList(@Query('userId') userId: string) {
    return this.service.getUserSupplementList(+userId);
  }

  @Get('admin')
  getAdminSupplementList() {
    return this.service.getAdminSupplementList();
  }

  @Get(':id')
  getSupplementDetail(@Param('id') id: string) {
    return this.service.getSupplementDetail(+id);
  }

  @Get('application/:applicationId')
  getSupplementByApplicationId(@Param('applicationId') applicationId: string) {
    return this.service.getSupplementByApplicationId(+applicationId);
  }

  @Post('upload/:supplementId')
  @UseInterceptors(FileInterceptor('file'))
  uploadSupplementMaterial(
    @Param('supplementId') supplementId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: {
      fieldName: string;
      materialName: string;
      uploaderId: string;
      required: string;
    },
  ) {
    return this.service.uploadSupplementMaterial(
      +supplementId,
      body.fieldName,
      body.materialName,
      file,
      +body.uploaderId,
      body.required === 'true',
    );
  }

  @Get('versions/:applicationId/:fieldName')
  getMaterialVersions(
    @Param('applicationId') applicationId: string,
    @Param('fieldName') fieldName: string,
  ) {
    return this.service.getMaterialVersions(+applicationId, fieldName);
  }

  @Get('rejected/:applicationId')
  getRejectedMaterials(@Param('applicationId') applicationId: string) {
    return this.service.getRejectedMaterials(+applicationId);
  }
}
