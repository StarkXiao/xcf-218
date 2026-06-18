import { Controller, Get, Post, Put, Delete, Param, Body, Query } from '@nestjs/common';
import { MaterialTemplateService } from './material-template.service';
import { MaterialTemplate } from '../../entities/material-template.entity';

@Controller('material-templates')
export class MaterialTemplateController {
  constructor(private readonly service: MaterialTemplateService) {}

  @Get()
  findAll(@Query('serviceItemId') serviceItemId?: string) {
    return this.service.findAll(serviceItemId ? +serviceItemId : undefined);
  }

  @Get('current/:serviceItemId')
  findCurrent(@Param('serviceItemId') serviceItemId: string) {
    return this.service.findCurrentByServiceItem(+serviceItemId);
  }

  @Get('by-service/:serviceItemId')
  findByServiceItem(@Param('serviceItemId') serviceItemId: string) {
    return this.service.findByServiceItem(+serviceItemId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(+id);
  }

  @Post()
  create(@Body() data: Partial<MaterialTemplate>) {
    return this.service.create(data);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() data: Partial<MaterialTemplate>) {
    return this.service.update(+id, data);
  }

  @Put(':id/enable')
  enable(@Param('id') id: string) {
    return this.service.enable(+id);
  }

  @Put(':id/disable')
  disable(@Param('id') id: string) {
    return this.service.disable(+id);
  }

  @Put(':id/switch')
  switchVersion(@Param('id') id: string) {
    return this.service.switchVersion(+id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(+id);
  }
}
