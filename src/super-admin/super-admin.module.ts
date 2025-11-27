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

@Module({
  imports: [
    PrismaModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'superSecretKey',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [SuperAdminAuthController, SuperAdminCompanyController],
  providers: [
    SuperAdminAuthService,
    SuperAdminJwtStrategy,
    SuperAdminCompanyService,
  ],
  exports: [SuperAdminAuthService],
})
export class SuperAdminModule {}
