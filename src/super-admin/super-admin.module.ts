import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from 'src/module/prisma/prisma.module';
import { SuperAdminAuthController } from './super-admin-auth.controller';
import { SuperAdminAuthService } from './super-admin-auth.service';
import { SuperAdminJwtStrategy } from './strategies/super-admin-jwt.strategy';
import 'dotenv/config';
import { SuperAdminCompanyController } from './super-admin-company.controller';
import { SuperAdminCompanyService } from './super-admin-company.service';
import { SuperAdminSubscriptionController } from './super-admin-subscription.controller';
import { SuperAdminSubscriptionService } from './super-admin-subscription.service';
import { SuperAdminMetricsController } from './super-admin-metrics.controller';
import { SuperAdminMetricsService } from './super-admin-metrics.service';
import { SuperAdminInvoiceController } from './super-admin-invoice.controller';
import { SuperAdminInvoiceService } from './super-admin-invoice.service';
import { SuperAdminWebhookController } from './super-admin-webhook.controller';
import { SuperAdminWebhookService } from './super-admin-webhook.service';

@Module({
  imports: [
    PrismaModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'superSecretKey',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [
    SuperAdminAuthController,
    SuperAdminCompanyController,
    SuperAdminSubscriptionController,
    SuperAdminMetricsController,
    SuperAdminInvoiceController,
    SuperAdminWebhookController,
  ],
  providers: [
    SuperAdminAuthService,
    SuperAdminJwtStrategy,
    SuperAdminCompanyService,
    SuperAdminSubscriptionService,
    SuperAdminMetricsService,
    SuperAdminInvoiceService,
    SuperAdminWebhookService,
  ],
  exports: [SuperAdminAuthService],
})
export class SuperAdminModule {}
