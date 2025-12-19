import {
  Injectable,
  Logger,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
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
      const request = context.switchToHttp().getRequest();

      let errorMessage = 'Acesso não autorizado';
      let errorCode = 'UNAUTHORIZED';

      if (info) {
        switch (info.message) {
          case 'No auth token':
            errorMessage =
              'Usuário não autenticado. Por favor, faça login para acessar este recurso.';
            errorCode = 'MISSING_TOKEN';
            break;
          case 'invalid signature':
          case 'jwt malformed':
            errorMessage =
              'Usuário não autenticado. Por favor, faça login novamente.';
            errorCode = 'INVALID_TOKEN';
            break;
          case 'jwt expired':
            errorMessage = 'Sessão expirada. Por favor, faça login novamente.';
            errorCode = 'TOKEN_EXPIRED';
            break;
          case 'jwt not active':
            errorMessage = 'usuário ainda não está ativo.';
            errorCode = 'TOKEN_NOT_ACTIVE';
            break;
          default:
            errorMessage = `Falha na autenticação: ${info.message}`;
        }
      }

      this.logger.error(
        `Falha na autenticação para rota ${request.method} ${request.url}:`,
        {
          errorCode,
          errorMessage,
          info: info?.message,
          userPresent: !!user,
          ip: request.ip,
          userAgent: request.headers['user-agent'],
        },
      );

      throw new UnauthorizedException({
        statusCode: 401,
        message: errorMessage,
        error: 'Unauthorized',
        errorCode,
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
      });
    }

    return user;
  }
}
