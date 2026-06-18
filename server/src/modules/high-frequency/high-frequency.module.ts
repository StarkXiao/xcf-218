import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HighFrequencyService } from './high-frequency.service';
import { HighFrequencyController } from './high-frequency.controller';
import { HotItem } from '../../entities/hot-item.entity';
import { HotCategory } from '../../entities/hot-category.entity';
import { ServiceItem } from '../../entities/service-item.entity';
import { Application } from '../../entities/application.entity';
import { FavoriteModule } from '../favorite/favorite.module';
import { SubscriptionModule } from '../subscription/subscription.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([HotItem, HotCategory, ServiceItem, Application]),
    forwardRef(() => FavoriteModule),
    forwardRef(() => SubscriptionModule),
  ],
  controllers: [HighFrequencyController],
  providers: [HighFrequencyService],
  exports: [HighFrequencyService],
})
export class HighFrequencyModule {}
