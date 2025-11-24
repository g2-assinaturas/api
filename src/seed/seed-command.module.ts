import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/module/prisma/prisma.module';
import { SeedService } from './seed.service';
import { SeedCommand } from './seed.command';

@Module({
    imports: [PrismaModule],
    providers: [SeedService, SeedCommand],
})
export class SeedCommandModule {}
