import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { StripeModule } from '../modules/stripe/stripe.module';
import { PrismaModule } from '../module/prisma/prisma.module';
import { RawBodyMiddleware } from './raw-body.middleware';

@Module({
  imports: [StripeModule, PrismaModule],
  controllers: [WebhooksController],
  providers: [WebhooksService],
  exports: [WebhooksService],
})
export class WebhooksModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Aplica o middleware de raw body apenas na rota de webhooks
    consumer.apply(RawBodyMiddleware).forRoutes('webhooks/stripe');
  }
}
