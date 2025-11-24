import { SeedService } from './seed.service';
import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/module/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [SeedService],
  exports: [SeedService]
})
export class SeedModule {}
