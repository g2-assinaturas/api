import { Injectable } from '@nestjs/common';
import { PrismaPlansRepository } from './repositories/prisma-plans.repository';

@Injectable()
export class PlansService {
  constructor(private readonly plansRepository: PrismaPlansRepository) {}

  async findAll() {
    return this.plansRepository.findAll();
  }
}
