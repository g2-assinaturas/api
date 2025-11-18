import { Injectable } from '@nestjs/common';
import { PrismaPlansRepository } from './repositories/prisma-plans.repository';

@Injectable()
export class PlansService {
  constructor(private readonly plansRepository: PrismaPlansRepository) {}

  findAll() {
    // Aqui eu só delego para o repositório de planos baseado em Prisma
    return this.plansRepository.findAll();
  }
}
