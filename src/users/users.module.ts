import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { InMemoryUsersRepository } from './repositories/in-memory-users.repository';
import { PrismaUsersRepository } from './repositories/prisma-users.repository';
import { UsersRepository } from './repositories/users.repository';

@Module({
  controllers: [UsersController],
  providers: [
    // Aqui eu defino qual implementação do repositório eu quero usar agora
    {
      provide: UsersRepository,
      useClass: InMemoryUsersRepository,
    },
    PrismaUsersRepository,
  ],
  exports: [UsersRepository],
})
export class UsersModule {}
