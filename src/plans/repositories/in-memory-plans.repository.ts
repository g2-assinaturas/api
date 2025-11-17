// Repositório em memória com alguns planos fake só para eu conseguir testar a listagem
import { PlanDto } from '../dto/plan.dto';

const plansStore: PlanDto[] = [
  {
    id: 'plan_basic',
    name: 'Basic',
    description: 'Plano básico para começar a usar o sistema',
    price: 4900,
    currency: 'BRL',
    interval: 'MONTHLY',
    active: true,
  },
  {
    id: 'plan_pro',
    name: 'Pro',
    description: 'Plano intermediário para negócios em crescimento',
    price: 9900,
    currency: 'BRL',
    interval: 'MONTHLY',
    active: true,
  },
  {
    id: 'plan_annual',
    name: 'Annual',
    description: 'Plano anual com desconto',
    price: 99000,
    currency: 'BRL',
    interval: 'YEARLY',
    active: true,
  },
];

export class InMemoryPlansRepository {
  findAll(): PlanDto[] {
    // Retorno somente planos ativos por enquanto
    return plansStore.filter((plan) => plan.active);
  }
}
