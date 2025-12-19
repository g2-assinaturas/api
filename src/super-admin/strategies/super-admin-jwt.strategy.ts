import { ExtractJwt, Strategy } from 'passport-jwt';
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { SuperAdminAuthService } from '../super-admin-auth.service';
import 'dotenv/config';

@Injectable()
export class SuperAdminJwtStrategy extends PassportStrategy(
  Strategy,
  'super-admin-jwt',
) {
  constructor(private superAdminAuthService: SuperAdminAuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'superSecretKey',
    });
  }

  async validate(payload: any) {
    return await this.superAdminAuthService.validateToken(payload);
  }
}
