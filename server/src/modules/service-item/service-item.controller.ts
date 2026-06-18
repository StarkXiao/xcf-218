import { Controller, Get, Param, Query } from '@nestjs/common';
import { ServiceItemService } from './service-item.service';

@Controller('service-items')
export class ServiceItemController {
  constructor(private readonly service: ServiceItemService) {}

  @Get()
  findAll(@Query('keyword') keyword?: string, @Query('category') category?: string) {
    return this.service.findAll(keyword, category);
  }

  @Get('categories')
  getCategories() {
    return this.service.getCategories();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(+id);
  }
}
