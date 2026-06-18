import { Controller, Post, Get, Param, Query, Body } from '@nestjs/common';
import { FavoriteService } from './favorite.service';

@Controller('favorites')
export class FavoriteController {
  constructor(private readonly service: FavoriteService) {}

  @Post('toggle')
  toggle(@Body() body: { userId: number; serviceItemId: number }) {
    return this.service.toggle(body.userId, body.serviceItemId);
  }

  @Get()
  findByUserId(@Query('userId') userId: string) {
    return this.service.findByUserId(+userId);
  }

  @Get('check')
  checkFavorite(@Query('userId') userId: string, @Query('serviceItemId') serviceItemId: string) {
    return this.service.checkFavorite(+userId, +serviceItemId);
  }

  @Get('count/:serviceItemId')
  getFavoriteCount(@Param('serviceItemId') serviceItemId: string) {
    return this.service.getFavoriteCount(+serviceItemId);
  }
}
