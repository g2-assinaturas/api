import { Module } from '@nestjs/common';
import { PlansController } from './plans.controller';
import { PlansService } from './plans.service';
import { InMemoryPlansRepository } from './repositories/in-memory-plans.repository';

@Module({
  controllers: [PlansController],
  providers: [PlansService, InMemoryPlansRepository],
  exports: [PlansService],
})
export class PlansModule {}
