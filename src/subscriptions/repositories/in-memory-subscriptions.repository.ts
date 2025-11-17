// Repositório em memória para eu conseguir simular assinaturas sem banco nem gateway
import { SubscriptionDto, SubscriptionStatusDto, InvoiceDto } from '../dto/subscription.dto';
import { PlanDto } from '../../plans/dto/plan.dto';

interface StoredSubscription extends SubscriptionDto {
  userId: string;
}

const subscriptionsStore: StoredSubscription[] = [];
const invoicesStore: InvoiceDto[] = [];

export class InMemorySubscriptionsRepository {
  createSubscription(userId: string, plan: PlanDto): SubscriptionDto {
    const now = new Date();
    const sub: StoredSubscription = {
      id: `sub_${subscriptionsStore.length + 1}`,
      userId,
      status: 'ACTIVE' satisfies SubscriptionStatusDto,
      plan,
      currentPeriodStart: now,
      currentPeriodEnd: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // +30 dias
      cancelAtPeriodEnd: false,
    };

    subscriptionsStore.push(sub);

    const invoice: InvoiceDto = {
      id: `inv_${invoicesStore.length + 1}`,
      amount: plan.price,
      currency: plan.currency,
      status: 'PAID',
      paidAt: now,
    };

    invoicesStore.push(invoice);

    return sub;
  }

  findCurrentByUserId(userId: string): SubscriptionDto | null {
    // Por enquanto eu considero a última assinatura ativa como a atual
    const list = subscriptionsStore.filter((s) => s.userId === userId);
    if (list.length === 0) return null;
    return list[list.length - 1];
  }

  cancelCurrent(userId: string, cancelAtPeriodEnd: boolean): SubscriptionDto | null {
    const current = this.findCurrentByUserId(userId) as StoredSubscription | null;
    if (!current) return null;

    if (cancelAtPeriodEnd) {
      current.cancelAtPeriodEnd = true;
    } else {
      current.status = 'CANCELED';
    }

    return current;
  }

  listInvoicesByUserId(userId: string): InvoiceDto[] {
    // No modo demo eu não estou relacionando invoice com userId, então devolvo todas
    return invoicesStore;
  }
}
