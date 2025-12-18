import { StripeConnectModule } from './modules/stripe-connect/stripe-connect.module';
import { CompanyPlansModule } from './company-plans/company-plans.module';
import { CompanyAuthModule } from './company-auth/company-auth.module';
import { SuperAdminModule } from './super-admin/super-admin.module';
import { SeedCommandModule } from './seed/seed-command.module';
import { SeedModule } from './seed/seed.module';
import { PrismaModule } from './module/prisma/prisma.module';
import { PrismaService } from './module/prisma/prisma.service';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PlansModule } from './plans/plans.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { StripeModule } from './modules/stripe/stripe.module';
import { WebhooksModule } from './webhooks/webhooks.module';

@Module({
  imports: [
    StripeConnectModule,
    CompanyPlansModule,
    StripeModule,
    WebhooksModule,
    CompanyAuthModule,
    SuperAdminModule,
    SeedCommandModule,
    SeedModule,
    PrismaModule,
    AuthModule,
    UsersModule,
    PlansModule,
    SubscriptionsModule,
  ],
  controllers: [AppController],
  providers: [PrismaService, AppService],
})
export class AppModule {}
