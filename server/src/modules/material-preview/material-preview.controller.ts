import { Controller, Post, Get, Put, Delete, Param, Body, Query } from '@nestjs/common';
import { MaterialPreviewService, PreviewRequest } from './material-preview.service';
import { MaterialPreviewRule } from '../../entities/material-preview-rule.entity';

@Controller('material-preview')
export class MaterialPreviewController {
  constructor(private readonly service: MaterialPreviewService) {}

  @Post('preview')
  preview(@Body() request: PreviewRequest) {
    return this.service.preview(request);
  }

  @Get('rules')
  getRules(
    @Query('serviceItemId') serviceItemId: string,
    @Query('materialTemplateId') materialTemplateId?: string,
  ) {
    return this.service.getOrCreateRules(
      Number(serviceItemId),
      materialTemplateId ? Number(materialTemplateId) : undefined,
    );
  }

  @Post('rules')
  createRule(@Body() data: Partial<MaterialPreviewRule>) {
    return this.service.createRule(data);
  }

  @Put('rules/:id')
  updateRule(@Param('id') id: string, @Body() data: Partial<MaterialPreviewRule>) {
    return this.service.updateRule(Number(id), data);
  }

  @Delete('rules/:id')
  deleteRule(@Param('id') id: string) {
    return this.service.deleteRule(Number(id));
  }

  @Post('rules/batch')
  batchCreateRules(
    @Body() body: {
      serviceItemId: number;
      materialTemplateId?: number;
      rules: Partial<MaterialPreviewRule>[];
    },
  ) {
    return this.service.batchCreateRules(
      body.serviceItemId,
      body.materialTemplateId,
      body.rules,
    );
  }
}
