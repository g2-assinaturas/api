import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, Logger } from '@nestjs/common';
import { CompanyAuthService } from '../company-auth.service';
import 'dotenv/config';

@Injectable()
export class CompanyJwtStrategy extends PassportStrategy(
  Strategy,
  'company-jwt',
) {
  private readonly logger = new Logger(CompanyJwtStrategy.name);

  constructor(private companyAuthService: CompanyAuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'companySecretKey',
    });

    this.logger.log('CompanyJwtStrategy inicializado'); // AQUI ESTÁ A MUDANÇA: Log de inicialização
    this.logger.log(
      `Secret usado: ${process.env.JWT_SECRET ? 'Vindo de env' : 'companySecretKey (default)'}`,
    );
  }

  async validate(payload: any) {
    this.logger.log(
      `Validando token. Payload recebido: ${JSON.stringify(payload)}`,
    );

    try {
      const user = await this.companyAuthService.validateToken(payload);
      this.logger.log(`Token validado com sucesso para usuário: ${user.id}`);
      return user;
    } catch (error) {
      this.logger.error(
        `Erro na validação do token: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
