import { Injectable, NotFoundException } from '@nestjs/common';
import { PlansService } from '../plans/plans.service';
import { PrismaSubscriptionsRepository } from './repositories/prisma-subscriptions.repository';
import {
  CancelSubscriptionDto,
  CheckoutSubscriptionDto,
} from './dto/subscription.dto';
import { StripeService } from '../payments/stripe/stripe.service';
import { UsersRepository } from '../users/repositories/users.repository';

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly plansService: PlansService,
    private readonly subscriptionsRepository: PrismaSubscriptionsRepository,
    private readonly stripeService: StripeService,
    private readonly usersRepository: UsersRepository,
  ) {}

  listPlans() {
    // Aqui eu uso o serviço de planos para centralizar a regra de listagem
    return this.plansService.findAll();
  }

  async checkout(userId: string, data: CheckoutSubscriptionDto) {
    const plans = await this.plansService.findAll();
    const plan = plans.find((p) => p.id === data.planId);

    if (!plan) {
      throw new NotFoundException('Plano não encontrado');
    }

    // Eu preciso garantir que o plano tem um priceId do Stripe configurado
    // (isso vem da criação do produto/preço no painel do Stripe ou via script separado)
    const stripePriceId = (plan as any).stripePriceId ?? null;
    if (!stripePriceId) {
      throw new NotFoundException('Plano não está configurado com stripePriceId');
    }

    // Agora eu busco o usuário para ter dados de nome/email para o customer do Stripe
    const user = await this.usersRepository.findByEmailOrCpf(userId);


    const customerId = undefined as unknown as string;

    const { subscriptionId } = await this.stripeService.createSubscription({
      customerId,
      priceId: stripePriceId,
    });

    // Aqui eu delego para o repositório baseado em Prisma criar a assinatura
    // e eu posso estender depois o método createSubscription para também salvar stripeSubscriptionId
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
