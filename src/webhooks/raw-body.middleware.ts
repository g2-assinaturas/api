import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

//Middleware para capturar o body raw da requisição
@Injectable()
export class RawBodyMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    if (req.originalUrl === '/webhooks/stripe') {
      let data = '';

      req.setEncoding('utf8');

      req.on('data', (chunk) => {
        data += chunk;
      });

      req.on('end', () => {
        req['rawBody'] = Buffer.from(data, 'utf8');
        next();
      });
    } else {
      next();
    }
  }
}
