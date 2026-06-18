import { Controller, Get, Param } from '@nestjs/common';
import { ProgressService } from './progress.service';

@Controller('progress')
export class ProgressController {
  constructor(private readonly service: ProgressService) {}

  @Get('application/:id')
  findByApplicationId(@Param('id') id: string) {
    return this.service.findByApplicationId(+id);
  }
}
