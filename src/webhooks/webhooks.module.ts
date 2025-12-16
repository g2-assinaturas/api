import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { StripeWebhookController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { StripeModule } from '../modules/stripe/stripe.module';
import { PrismaModule } from '../module/prisma/prisma.module';
import { RawBodyMiddleware } from './raw-body.middleware';
import { SubscriptionsModule } from 'src/subscriptions/subscriptions.module';

@Module({
  imports: [StripeModule, PrismaModule, SubscriptionsModule],
  controllers: [StripeWebhookController],
  providers: [WebhooksService],
  exports: [WebhooksService],
})
export class WebhooksModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Aplica o middleware de raw body apenas na rota de webhooks
    consumer.apply(RawBodyMiddleware).forRoutes('webhooks/stripe');
  }
}
