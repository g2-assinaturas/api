import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from 'src/module/prisma/prisma.module';
import { SuperAdminAuthController } from './super-admin-auth.controller';
import { SuperAdminAuthService } from './super-admin-auth.service';
import { SuperAdminJwtStrategy } from './strategies/super-admin-jwt.strategy';
import 'dotenv/config';

@Module({
  imports: [
    PrismaModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'superSecretKey',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [SuperAdminAuthController],
  providers: [SuperAdminAuthService, SuperAdminJwtStrategy],
  exports: [SuperAdminAuthService],
})
export class SuperAdminModule {}
