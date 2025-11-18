import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { PrismaUsersRepository } from './repositories/prisma-users.repository';
import { UsersRepository } from './repositories/users.repository';
import { PrismaModule } from 'src/module/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [UsersController],
  providers: [
    // Aqui eu defino qual implementação do repositório eu quero usar agora
    {
      provide: UsersRepository,
      useClass: PrismaUsersRepository,
    },
  ],
  exports: [UsersRepository],
})
export class UsersModule {}
