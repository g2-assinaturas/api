import { Injectable } from '@nestjs/common';
import { InMemoryPlansRepository } from './repositories/in-memory-plans.repository';

@Injectable()
export class PlansService {
  constructor(private readonly plansRepository: InMemoryPlansRepository) {}

  findAll() {
    // Aqui eu só delego para o repositório em memória
    return this.plansRepository.findAll();
  }
}
