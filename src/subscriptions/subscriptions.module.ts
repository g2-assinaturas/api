import { Module } from '@nestjs/common';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { PlansModule } from '../plans/plans.module';
import { InMemorySubscriptionsRepository } from './repositories/in-memory-subscriptions.repository';

@Module({
  imports: [PlansModule],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, InMemorySubscriptionsRepository],
})
export class SubscriptionsModule {}
