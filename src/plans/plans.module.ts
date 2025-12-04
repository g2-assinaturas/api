import { Module } from '@nestjs/common';
import { PlansController } from './plans.controller';
import { PlansService } from './plans.service';
import { PrismaPlansRepository } from './repositories/prisma-plans.repository';

@Module({
  controllers: [PlansController],
  providers: [PlansService, PrismaPlansRepository],
  exports: [PlansService],
})
export class PlansModule {}
