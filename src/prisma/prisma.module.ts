import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// Módulo global para eu poder injetar PrismaService em qualquer lugar
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
