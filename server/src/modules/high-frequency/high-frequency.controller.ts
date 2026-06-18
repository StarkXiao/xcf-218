import { Controller, Get, Param, Query, Post, Body, Put, Delete } from '@nestjs/common';
import { HighFrequencyService } from './high-frequency.service';
import { HotItem } from '../../entities/hot-item.entity';
import { HotCategory } from '../../entities/hot-category.entity';

@Controller('high-frequency')
export class HighFrequencyController {
  constructor(private readonly service: HighFrequencyService) {}

  @Get('items')
  getHotItems(@Query('userId') userId?: string) {
    return this.service.getHotItems(userId ? +userId : undefined);
  }

  @Get('banners')
  getBanners(@Query('userId') userId?: string) {
    return this.service.getBanners(userId ? +userId : undefined);
  }

  @Get('quick-apply')
  getQuickApplyItems(@Query('userId') userId?: string) {
    return this.service.getQuickApplyItems(userId ? +userId : undefined);
  }

  @Get('categories')
  getHotCategories() {
    return this.service.getHotCategories();
  }

  @Get('category/:id')
  getItemsByCategory(@Param('id') id: string, @Query('userId') userId?: string) {
    return this.service.getItemsByCategory(+id, userId ? +userId : undefined);
  }

  @Get('ranking')
  getHotRanking(@Query('limit') limit?: string, @Query('userId') userId?: string) {
    return this.service.getHotRanking(limit ? +limit : 10, userId ? +userId : undefined);
  }

  @Get('heat-statistics/:serviceItemId')
  getHeatStatistics(@Param('serviceItemId') serviceItemId: string) {
    return this.service.getHeatStatistics(+serviceItemId);
  }

  @Put('click/:id')
  incrementClickCount(@Param('id') id: string) {
    return this.service.incrementClickCount(+id);
  }

  @Get('admin/categories')
  findAllCategories() {
    return this.service.findAllCategories();
  }

  @Get('admin/items')
  findAllItems(@Query('keyword') keyword?: string, @Query('categoryId') categoryId?: string) {
    return this.service.findAllItems(keyword, categoryId ? +categoryId : undefined);
  }

  @Get('admin/available-services')
  getAvailableServiceItems() {
    return this.service.getAvailableServiceItems();
  }

  @Get('admin/category/:id')
  getCategoryById(@Param('id') id: string) {
    return this.service.getCategoryById(+id);
  }

  @Get('admin/item/:id')
  getItemById(@Param('id') id: string) {
    return this.service.getItemById(+id);
  }

  @Post('admin/category')
  createCategory(@Body() data: Partial<HotCategory>) {
    return this.service.createCategory(data);
  }

  @Put('admin/category/:id')
  updateCategory(@Param('id') id: string, @Body() data: Partial<HotCategory>) {
    return this.service.updateCategory(+id, data);
  }

  @Delete('admin/category/:id')
  deleteCategory(@Param('id') id: string) {
    return this.service.deleteCategory(+id);
  }

  @Post('admin/item')
  createItem(@Body() data: Partial<HotItem>) {
    return this.service.createItem(data);
  }

  @Put('admin/item/:id')
  updateItem(@Param('id') id: string, @Body() data: Partial<HotItem>) {
    return this.service.updateItem(+id, data);
  }

  @Delete('admin/item/:id')
  deleteItem(@Param('id') id: string) {
    return this.service.deleteItem(+id);
  }

  @Put('admin/item/:id/toggle-active')
  toggleItemActive(@Param('id') id: string, @Body() body: { active: boolean }) {
    return this.service.toggleItemActive(+id, body.active);
  }

  @Put('admin/item/:id/sort')
  updateItemSort(@Param('id') id: string, @Body() body: { sort: number }) {
    return this.service.updateItemSort(+id, body.sort);
  }
}
