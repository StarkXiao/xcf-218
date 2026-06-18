import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MaterialTemplate } from '../../entities/material-template.entity';
import { MaterialTemplateController } from './material-template.controller';
import { MaterialTemplateService } from './material-template.service';

@Module({
  imports: [TypeOrmModule.forFeature([MaterialTemplate])],
  controllers: [MaterialTemplateController],
  providers: [MaterialTemplateService],
  exports: [MaterialTemplateService],
})
export class MaterialTemplateModule {}
