import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MaterialPreviewRule } from '../../entities/material-preview-rule.entity';
import { MaterialPreviewService } from './material-preview.service';
import { MaterialPreviewController } from './material-preview.controller';
import { MaterialTemplateService } from '../material-template/material-template.service';
import { MaterialTemplate } from '../../entities/material-template.entity';
import { ServiceItem } from '../../entities/service-item.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([MaterialPreviewRule, MaterialTemplate, ServiceItem]),
  ],
  controllers: [MaterialPreviewController],
  providers: [MaterialPreviewService, MaterialTemplateService],
  exports: [MaterialPreviewService],
})
export class MaterialPreviewModule {}
