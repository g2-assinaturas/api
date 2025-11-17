import { Injectable, NotFoundException } from '@nestjs/common';
import { PlansService } from '../plans/plans.service';
import { InMemorySubscriptionsRepository } from './repositories/in-memory-subscriptions.repository';
import {
  CancelSubscriptionDto,
  CheckoutSubscriptionDto,
} from './dto/subscription.dto';

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly plansService: PlansService,
    private readonly subscriptionsRepository: InMemorySubscriptionsRepository,
  ) {}

  listPlans() {
    // Aqui eu uso o serviço de planos para centralizar a regra de listagem
    return this.plansService.findAll();
  }

  checkout(userId: string, data: CheckoutSubscriptionDto) {
    // Primeiro eu preciso garantir que o plano existe
    const plans = this.plansService.findAll();
    const plan = plans.find((p) => p.id === data.planId);

    if (!plan) {
      throw new NotFoundException('Plano não encontrado');
    }

    // Aqui eu delego para o repositório em memória criar a assinatura
    return this.subscriptionsRepository.createSubscription(userId, plan);
  }

  getCurrent(userId: string) {
    // Aqui eu busco a assinatura atual do usuário (modo demo)
    return this.subscriptionsRepository.findCurrentByUserId(userId);
  }

  cancel(userId: string, data: CancelSubscriptionDto) {
    const cancelAtPeriodEnd = data.cancelAtPeriodEnd ?? true;
    return this.subscriptionsRepository.cancelCurrent(userId, cancelAtPeriodEnd);
  }

  listInvoices(userId: string) {
    // Modo demo: só delega para o repositório em memória
    return this.subscriptionsRepository.listInvoicesByUserId(userId);
  }
}
