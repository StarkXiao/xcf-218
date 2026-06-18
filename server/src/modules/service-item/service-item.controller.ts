import { Controller, Get, Param, Query, Post, Body, Put, Delete } from '@nestjs/common';
import { ServiceItemService } from './service-item.service';
import { ServiceItem } from '../../entities/service-item.entity';

@Controller('service-items')
export class ServiceItemController {
  constructor(private readonly service: ServiceItemService) {}

  @Get()
  findAll(
    @Query('keyword') keyword?: string,
    @Query('category') category?: string,
    @Query('userId') userId?: string,
  ) {
    return this.service.findAll(keyword, category, userId ? +userId : undefined);
  }

  @Get('categories')
  getCategories() {
    return this.service.getCategories();
  }

  @Get('recommended')
  getRecommended(@Query('userId') userId?: string, @Query('limit') limit?: string) {
    return this.service.getRecommended(userId ? +userId : undefined, limit ? +limit : 6);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Query('userId') userId?: string) {
    return this.service.findOne(+id, userId ? +userId : undefined);
  }

  @Post()
  create(@Body() data: Partial<ServiceItem>) {
    return this.service.create(data);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() data: Partial<ServiceItem>) {
    return this.service.update(+id, data);
  }

  @Put(':id/publish')
  publish(@Param('id') id: string, @Body() body: { adminId: number }) {
    return this.service.publish(+id, body.adminId);
  }

  @Put(':id/unpublish')
  unpublish(@Param('id') id: string) {
    return this.service.unpublish(+id);
  }

  @Put(':id/recommend')
  toggleRecommend(@Param('id') id: string, @Body() body: { recommended: boolean }) {
    return this.service.toggleRecommend(+id, body.recommended);
  }

  @Get('admin/all')
  findAllAdmin(@Query('keyword') keyword?: string, @Query('category') category?: string) {
    return this.service.findAllAdmin(keyword, category);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(+id);
  }
}
