import { Module } from '@nestjs/common';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { PlansModule } from '../plans/plans.module';
import { StripeModule } from '../modules/stripe/stripe.module';
import { PrismaModule } from '../module/prisma/prisma.module';

@Module({
  imports: [PlansModule, StripeModule, PrismaModule],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
