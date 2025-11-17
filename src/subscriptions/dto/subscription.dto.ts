// DTOs relacionados a assinaturas que eu vou expor para o frontend
import { PlanDto } from '../../plans/dto/plan.dto';

export type SubscriptionStatusDto =
  | 'PENDING'
  | 'ACTIVE'
  | 'CANCELED'
  | 'EXPIRED'
  | 'PAYMENT_FAILED'
  | 'PAST_DUE';

export class SubscriptionDto {
  id: string;
  status: SubscriptionStatusDto;
  plan: PlanDto;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd: boolean;
}

export class CheckoutSubscriptionDto {
  // Id do plano que eu quero assinar
  planId: string;
}

export class CancelSubscriptionDto {
  // Se eu quero cancelar só no fim do período ou imediato (no mundo real depende do gateway)
  cancelAtPeriodEnd?: boolean;
}

export class InvoiceDto {
  id: string;
  amount: number;
  currency: string;
  status:
    | 'DRAFT'
    | 'OPEN'
    | 'PAID'
    | 'VOID'
    | 'UNCOLLECTIBLE';
  dueDate?: Date;
  paidAt?: Date;
}
