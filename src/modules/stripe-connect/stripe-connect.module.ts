import { Module, Global } from '@nestjs/common';
import { StripeConnectService } from './stripe-connect.service';
import { PrismaModule } from 'src/module/prisma/prisma.module';
import { CompanyStripeController } from './company-stripe.controller';

@Global()
@Module({
  imports: [PrismaModule],
  controllers: [CompanyStripeController],
  providers: [StripeConnectService],
  exports: [StripeConnectService],
})
export class StripeConnectModule {}
