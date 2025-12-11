import { Injectable, Logger, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

@Injectable()
export class CompanyJwtGuard extends AuthGuard('company-jwt') {
  private readonly logger = new Logger(CompanyJwtGuard.name);

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    this.logger.log(
      `CompanyJwtGuard acionado para rota: ${request.method} ${request.url}`,
    );
    this.logger.log(
      `Authorization header: ${authHeader ? authHeader.substring(0, 50) + '...' : 'AUSENTE'}`,
    );

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    this.logger.log(
      `Resultado da autenticação - Erro: ${err ? err.message : 'null'}, Usuário: ${user ? user.id : 'null'}, Info: ${info ? info.message : 'null'}`,
    );

    if (err || !user) {
      this.logger.error(`Falha na autenticação. Detalhes:`, {
        err: err?.message,
        info: info?.message,
        userPresent: !!user,
        contextPath: context.switchToHttp().getRequest().url,
      });
      throw err || new Error('Usuário não autenticado');
    }

    return user;
  }
}
