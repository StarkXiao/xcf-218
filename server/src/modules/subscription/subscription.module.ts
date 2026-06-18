import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Subscription } from '../../entities/subscription.entity';
import { Message } from '../../entities/message.entity';
import { SubscriptionService } from './subscription.service';
import { SubscriptionController } from './subscription.controller';
import { ServiceItemModule } from '../service-item/service-item.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Subscription, Message]),
    forwardRef(() => ServiceItemModule),
  ],
  controllers: [SubscriptionController],
  providers: [SubscriptionService],
  exports: [SubscriptionService],
})
export class SubscriptionModule {}
