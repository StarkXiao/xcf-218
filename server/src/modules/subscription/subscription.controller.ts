import { Controller, Post, Get, Param, Query, Body } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';

@Controller('subscriptions')
export class SubscriptionController {
  constructor(private readonly service: SubscriptionService) {}

  @Post('toggle')
  toggle(
    @Body() body: {
      userId: number;
      serviceItemId: number;
      notifyOnUpdate?: boolean;
      notifyOnStatusChange?: boolean;
    },
  ) {
    return this.service.toggle(body.userId, body.serviceItemId, {
      notifyOnUpdate: body.notifyOnUpdate,
      notifyOnStatusChange: body.notifyOnStatusChange,
    });
  }

  @Get()
  findByUserId(@Query('userId') userId: string) {
    return this.service.findByUserId(+userId);
  }

  @Get('check')
  checkSubscription(@Query('userId') userId: string, @Query('serviceItemId') serviceItemId: string) {
    return this.service.checkSubscription(+userId, +serviceItemId);
  }
}
