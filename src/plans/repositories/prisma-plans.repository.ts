// Repositório de planos usando Prisma
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/module/prisma/prisma.service';
import { PlanDto } from '../dto/plan.dto';

@Injectable()
export class PrismaPlansRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<PlanDto[]> {
    // Aqui eu busco todos os planos ativos do banco e mapeio para o DTO
    const plans = await this.prisma.plan.findMany({
      where: { active: true },
      orderBy: { price: 'asc' },
    });

    return plans.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description ?? undefined,
      price: p.price,
      currency: p.currency,
      interval: p.interval,
      active: p.active,
    }));
  }
}
