import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { InMemoryUsersRepository } from './repositories/in-memory-users.repository';

@Module({
  controllers: [UsersController],
  providers: [InMemoryUsersRepository],
  exports: [InMemoryUsersRepository],
})
export class UsersModule {}
