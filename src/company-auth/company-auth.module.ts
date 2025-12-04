import { CompanyAuthController } from './company-auth.controller';
import { CompanyAuthService } from './company-auth.service';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from 'src/module/prisma/prisma.module';
import { CompanyJwtStrategy } from './strategies/company-jwt.strategy';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'companySecretKey',
      signOptions: { expiresIn: '24' },
    }),
  ],
  controllers: [CompanyAuthController, CompanyAuthController],
  providers: [CompanyAuthService, CompanyJwtStrategy],
  exports: [CompanyAuthService],
})
export class CompanyAuthModule {}
