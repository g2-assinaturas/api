import { CommandFactory } from 'nest-commander';
import { SeedCommandModule } from './seed/seed-command.module';

async function bootstrap() {
  await CommandFactory.run(SeedCommandModule, {
    logger: ['error', 'warn', 'log'],
  });
}

bootstrap();
