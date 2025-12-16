import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const now = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          this.logger.log(
            `Resposta: ${method} ${url} - ${Date.now() - now}ms - Status: 200 OK`,
          );
        },
        error: (error) => {
          const statusCode = error.status || 500;
          const errorMessage = error.response?.message || error.message;

          this.logger.error(
            `Erro: ${method} ${url} - ${Date.now() - now}ms - Status: ${statusCode} - Mensagem: ${errorMessage}`,
          );

          if (statusCode >= 500) {
            this.logger.error('Stack trace do erro interno:', error.stack);
          }
        },
      }),
    );
  }
}
