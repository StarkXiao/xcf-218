import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServiceItem } from '../../entities/service-item.entity';
import { ServiceItemController } from './service-item.controller';
import { ServiceItemService } from './service-item.service';
import { SubscriptionModule } from '../subscription/subscription.module';
import { FavoriteModule } from '../favorite/favorite.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ServiceItem]),
    forwardRef(() => SubscriptionModule),
    forwardRef(() => FavoriteModule),
  ],
  controllers: [ServiceItemController],
  providers: [ServiceItemService],
  exports: [ServiceItemService],
})
export class ServiceItemModule {}
