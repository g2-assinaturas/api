// DTO que representa o que eu vou expor de um plano para o frontend
export class PlanDto {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  interval: 'MONTHLY' | 'HALF_YEARLY' | 'YEARLY';
  active: boolean;
}
