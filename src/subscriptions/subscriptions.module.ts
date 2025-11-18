import { Module } from '@nestjs/common';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { PlansModule } from '../plans/plans.module';
import { PrismaSubscriptionsRepository } from './repositories/prisma-subscriptions.repository';
import { PaymentsModule } from '../payments/payments.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [PlansModule, PaymentsModule, UsersModule],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, PrismaSubscriptionsRepository],
})
export class SubscriptionsModule {}
