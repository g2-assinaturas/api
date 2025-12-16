import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/module/prisma/prisma.service';
import { PlanDto } from '../dto/plan.dto';

@Injectable()
export class PrismaPlansRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<PlanDto[]> {
    const plans = await this.prisma.plan.findMany({
      where: { active: true },
      orderBy: { price: 'asc' },
    });

    const mapped: PlanDto[] = [];

    for (const plan of plans) {
      let interval: PlanDto['interval'];

      switch (plan.interval) {
        case 'MONTHLY':
          interval = 'MONTHLY';
          break;
        case 'YEARLY':
          interval = 'YEARLY';
          break;
        case 'BIANNUAL':
          interval = 'BIANNUAL';
          break;
        default:
          // Ignora planos com intervalos não suportados pelo DTO por enquanto
          continue;
      }

      mapped.push({
        id: plan.id,
        name: plan.name,
        description: plan.description ?? undefined,
        price: plan.price,
        currency: plan.currency,
        interval,
        active: plan.active,
      });
    }

    return mapped;
  }
}
