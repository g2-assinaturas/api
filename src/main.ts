import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, HttpException, HttpStatus } from '@nestjs/common';
import 'dotenv/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) => {
        const formattedErrors = errors.map((error) => ({
          property: error.property,
          constraints: error.constraints,
        }));

        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Erro de validação',
          errors: formattedErrors,
          timestamp: new Date().toISOString(),
        };
      },
    }),
  );

  app.use((error: any, req: any, res: any, next: any) => {
    console.error('Erro não tratado:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      path: req.url,
      method: req.method,
    });

    if (!(error instanceof HttpException)) {
      error = {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message:
          'Erro interno do servidor. Por favor, tente novamente mais tarde.',
        error: 'Internal Server Error',
        timestamp: new Date().toISOString(),
      };
    }

    next(error);
  });

  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 Aplicação rodando na porta ${port}`);
}

bootstrap();
