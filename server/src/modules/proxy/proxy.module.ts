import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProxyApplication } from '../../entities/proxy-application.entity';
import { ProxyProgressRecord } from '../../entities/proxy-progress-record.entity';
import { ProxyRelation } from '../../entities/proxy-relation.entity';
import { User } from '../../entities/user.entity';
import { Message } from '../../entities/message.entity';
import { ProxyController } from './proxy.controller';
import { ProxyService } from './proxy.service';

@Module({
  imports: [TypeOrmModule.forFeature([ProxyApplication, ProxyProgressRecord, ProxyRelation, User, Message])],
  controllers: [ProxyController],
  providers: [ProxyService],
  exports: [ProxyService],
})
export class ProxyModule {}
