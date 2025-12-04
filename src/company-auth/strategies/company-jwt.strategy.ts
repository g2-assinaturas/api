import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { CompanyAuthService } from '../company-auth.service';

@Injectable()
export class CompanyJwtStrategy extends PassportStrategy(
  Strategy,
  'company-jwt',
) {
  constructor(private companyAuthService: CompanyAuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'companySecretKey',
    });
  }

  async validate(payload: any) {
    return await this.companyAuthService.validateToken(payload);
  }
}
