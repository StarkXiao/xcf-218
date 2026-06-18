import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServiceItem } from '../../entities/service-item.entity';
import { ServiceItemController } from './service-item.controller';
import { ServiceItemService } from './service-item.service';

@Module({
  imports: [TypeOrmModule.forFeature([ServiceItem])],
  controllers: [ServiceItemController],
  providers: [ServiceItemService],
  exports: [ServiceItemService],
})
export class ServiceItemModule {}
