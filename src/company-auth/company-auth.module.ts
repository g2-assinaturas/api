import { CompanyAuthController } from './company-auth.controller';
import { CompanyAuthService } from './company-auth.service';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from 'src/module/prisma/prisma.module';
import { CompanyJwtStrategy } from './strategies/company-jwt.strategy';
import { LoggingInterceptor } from 'src/interceptors/logging.interceptor';
import { PassportModule } from '@nestjs/passport';
import 'dotenv/config';

@Module({
  imports: [
    PrismaModule,
    PassportModule.register({ defaultStrategy: 'company-jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'companySecretKey',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [CompanyAuthController],
  providers: [
    CompanyAuthService,
    CompanyJwtStrategy,
    { provide: 'APP_INTERCEPTOR', useClass: LoggingInterceptor },
  ],
  exports: [CompanyAuthService],
})
export class CompanyAuthModule {}
