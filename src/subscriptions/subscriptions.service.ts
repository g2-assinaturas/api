import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PlansService } from '../plans/plans.service';
import {
  CancelSubscriptionDto,
  CheckoutSubscriptionDto,
  SubscriptionStatusDto,
  InvoiceDto,
} from './dto/subscription.dto';
import { PrismaService } from 'src/module/prisma/prisma.service';
import { PlanDto } from '../plans/dto/plan.dto';
import { StripeService } from '../modules/stripe/stripe.service';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    private readonly plansService: PlansService,
    private readonly prisma: PrismaService,
    private readonly stripeService: StripeService,
  ) {}

  listPlans() {
    // Aqui eu uso o serviço de planos para centralizar a regra de listagem
    return this.plansService.findAll();
  }

  async checkout(userId: string, data: CheckoutSubscriptionDto) {
    // Busca o plano no banco
    const planEntity = await this.prisma.plan.findUnique({
      where: { id: data.planId },
      include: { company: true },
    });

    if (!planEntity) {
      throw new NotFoundException('Plano não encontrado');
    }

    // Busca o usuário da empresa
    const companyUser = await this.prisma.companyUser.findUnique({
      where: { id: userId },
      include: { company: true },
    });

    if (!companyUser) {
      throw new NotFoundException('Usuário da empresa não encontrado');
    }

    // Garante que existe um Customer
    let customer = await this.prisma.customer.findFirst({
      where: {
        email: companyUser.email,
        companyId: companyUser.companyId,
      },
    });

    if (!customer) {
      customer = await this.prisma.customer.create({
        data: {
          email: companyUser.email,
          name: companyUser.name,
          cpf: companyUser.cpf ?? null,
          phone: null,
          companyId: companyUser.companyId,
        },
      });
    }

    // Se Stripe estiver configurado, criar customer e assinatura no Stripe
    let stripeCustomerId: string | null = null;
    let stripeSubscriptionId: string | null = null;
    let stripePriceId: string | null = planEntity.stripePriceId;

    if (this.stripeService.isConfigured()) {
      this.logger.log('Stripe configurado, criando assinatura no Stripe');

      // Cria ou busca customer no Stripe
      if (!customer.externalId) {
        const stripeCustomer = await this.stripeService.createCustomer({
          email: customer.email,
          name: customer.name,
          metadata: {
            customerId: customer.id,
            companyId: companyUser.companyId,
          },
        });

        stripeCustomerId = stripeCustomer.id;

        // Atualiza customer no banco com ID do Stripe
        await this.prisma.customer.update({
          where: { id: customer.id },
          data: { externalId: stripeCustomerId },
        });
      } else {
        stripeCustomerId = customer.externalId;
      }

      // Se o plano não tem stripePriceId, precisamos criar produto e preço
      if (!stripePriceId) {
        this.logger.warn(
          `Plano ${planEntity.id} não tem stripePriceId. Criando no Stripe...`,
        );

        // Cria produto no Stripe
        const stripeProduct = await this.stripeService.createProduct({
          name: planEntity.name,
          description: planEntity.description || undefined,
          metadata: {
            planId: planEntity.id,
            companyId: planEntity.companyId,
          },
        });

        // Mapeia intervalo do plano para Stripe
        const intervalMap: Record<
          string,
          'day' | 'week' | 'month' | 'year'
        > = {
          DAILY: 'day',
          WEEKLY: 'week',
          MONTHLY: 'month',
          QUARTERLY: 'month',
          BIANNUAL: 'month',
          YEARLY: 'year',
        };

        const intervalCountMap: Record<string, number> = {
          DAILY: 1,
          WEEKLY: 1,
          MONTHLY: 1,
          QUARTERLY: 3,
          BIANNUAL: 6,
          YEARLY: 1,
        };

        const interval = intervalMap[planEntity.interval] || 'month';
        const intervalCount =
          intervalCountMap[planEntity.interval] || 1;

        // Cria preço no Stripe
        const stripePrice = await this.stripeService.createPrice({
          productId: stripeProduct.id,
          unitAmount: planEntity.price,
          currency: planEntity.currency,
          interval,
          intervalCount,
          metadata: {
            planId: planEntity.id,
          },
        });

        stripePriceId = stripePrice.id;

        // Atualiza plano com IDs do Stripe
        await this.prisma.plan.update({
          where: { id: planEntity.id },
          data: {
            stripeProductId: stripeProduct.id,
            stripePriceId: stripePrice.id,
          },
        });
      }

      // Cria assinatura no Stripe
      const stripeSubscription =
        await this.stripeService.createSubscription({
          customerId: stripeCustomerId,
          priceId: stripePriceId,
          metadata: {
            companyId: companyUser.companyId,
            companyName: companyUser.company.name,
            planId: planEntity.id,
          },
        });

      stripeSubscriptionId = stripeSubscription.id;

      this.logger.log(
        `Assinatura criada no Stripe: ${stripeSubscriptionId}`,
      );
    } else {
      this.logger.warn(
        'Stripe não configurado, criando assinatura apenas localmente',
      );
    }

    const now = new Date();

    // Calcula período baseado no intervalo
    let currentPeriodEnd: Date | null = null;
    const baseTime = now.getTime();

    switch (planEntity.interval) {
      case 'MONTHLY':
        currentPeriodEnd = new Date(baseTime + 30 * 24 * 60 * 60 * 1000);
        break;
      case 'QUARTERLY':
        currentPeriodEnd = new Date(baseTime + 90 * 24 * 60 * 60 * 1000);
        break;
      case 'BIANNUAL':
        currentPeriodEnd = new Date(baseTime + 182 * 24 * 60 * 60 * 1000);
        break;
      case 'YEARLY':
        currentPeriodEnd = new Date(baseTime + 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        currentPeriodEnd = new Date(baseTime + 30 * 24 * 60 * 60 * 1000);
    }

    // Cria assinatura no banco
    const subscription = await this.prisma.subscription.create({
      data: {
        status: stripeSubscriptionId ? 'PENDING' : 'ACTIVE',
        currentPeriodStart: now,
        currentPeriodEnd,
        cancelAtPeriodEnd: false,
        stripeSubscriptionId,
        stripeCustomerId,
        stripePriceId,
        customerId: customer.id,
        planId: planEntity.id,
        companyId: companyUser.companyId,
      },
      include: {
        plan: true,
      },
    });

    // Cria fatura apenas se não estiver usando Stripe (Stripe cria automaticamente)
    if (!stripeSubscriptionId) {
      await this.prisma.invoice.create({
        data: {
          amount: planEntity.price,
          currency: planEntity.currency,
          status: 'PAID',
          dueDate: currentPeriodEnd,
          paidAt: now,
          subscriptionId: subscription.id,
          companyId: companyUser.companyId,
        },
      });
    }

    // Mapeia intervalo para o DTO
    let interval: PlanDto['interval'] = 'MONTHLY';
    switch (planEntity.interval) {
      case 'MONTHLY':
        interval = 'MONTHLY';
        break;
      case 'YEARLY':
        interval = 'YEARLY';
        break;
      case 'BIANNUAL':
        interval = 'HALF_YEARLY';
        break;
    }

    const plan: PlanDto = {
      id: planEntity.id,
      name: planEntity.name,
      description: planEntity.description ?? undefined,
      price: planEntity.price,
      currency: planEntity.currency,
      interval,
      active: planEntity.active,
    };

    return {
      id: subscription.id,
      status: subscription.status as SubscriptionStatusDto,
      plan,
      currentPeriodStart: subscription.currentPeriodStart ?? undefined,
      currentPeriodEnd: subscription.currentPeriodEnd ?? undefined,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      stripeSubscriptionId,
    };
  }

  async getCurrent(userId: string) {
    // Primeiro, descubro a empresa a partir do usuário (CompanyUser)
    const companyUser = await this.prisma.companyUser.findUnique({
      where: { id: userId },
    });

    if (!companyUser) {
      throw new NotFoundException('Usuário da empresa não encontrado');
    }

    const subscription = await this.prisma.subscription.findFirst({
      where: {
        companyId: companyUser.companyId,
        status: {
          in: ['ACTIVE', 'TRIALING', 'PAST_DUE', 'PENDING'],
        },
      },
      orderBy: { createdAt: 'desc' },
      include: { plan: true },
    });

    if (!subscription) {
      return null;
    }

    const planEntity = subscription.plan;

    let interval: PlanDto['interval'];
    switch (planEntity.interval) {
      case 'MONTHLY':
        interval = 'MONTHLY';
        break;
      case 'YEARLY':
        interval = 'YEARLY';
        break;
      case 'BIANNUAL':
        interval = 'HALF_YEARLY';
        break;
      default:
        // Se o plano tiver um intervalo não suportado pelo DTO, uso MONTHLY por default
        interval = 'MONTHLY';
        break;
    }

    const plan: PlanDto = {
      id: planEntity.id,
      name: planEntity.name,
      description: planEntity.description ?? undefined,
      price: planEntity.price,
      currency: planEntity.currency,
      interval,
      active: planEntity.active,
    };

    return {
      id: subscription.id,
      status: subscription.status as SubscriptionStatusDto,
      plan,
      currentPeriodStart: subscription.currentPeriodStart ?? undefined,
      currentPeriodEnd: subscription.currentPeriodEnd ?? undefined,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    };
  }

  async cancel(userId: string, data: CancelSubscriptionDto) {
    const cancelAtPeriodEnd = data.cancelAtPeriodEnd ?? true;

    const companyUser = await this.prisma.companyUser.findUnique({
      where: { id: userId },
    });

    if (!companyUser) {
      throw new NotFoundException('Usuário da empresa não encontrado');
    }

    const subscription = await this.prisma.subscription.findFirst({
      where: {
        companyId: companyUser.companyId,
        status: {
          in: ['ACTIVE', 'TRIALING', 'PAST_DUE', 'PENDING'],
        },
      },
      orderBy: { createdAt: 'desc' },
      include: { plan: true },
    });

    if (!subscription) {
      throw new NotFoundException(
        'Nenhuma assinatura ativa encontrada para esta empresa',
      );
    }

    // Se houver stripeSubscriptionId, cancelar também no Stripe
    if (
      subscription.stripeSubscriptionId &&
      this.stripeService.isConfigured()
    ) {
      this.logger.log(
        `Cancelando assinatura no Stripe: ${subscription.stripeSubscriptionId}`,
      );

      await this.stripeService.cancelSubscription(
        subscription.stripeSubscriptionId,
        cancelAtPeriodEnd,
      );
    }

    const now = new Date();

    const updated = await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: cancelAtPeriodEnd
        ? {
            cancelAtPeriodEnd: true,
          }
        : {
            status: 'CANCELED',
            cancelAtPeriodEnd: false,
            currentPeriodEnd: now,
          },
      include: { plan: true },
    });

    const planEntity = updated.plan;

    let interval: PlanDto['interval'];
    switch (planEntity.interval) {
      case 'MONTHLY':
        interval = 'MONTHLY';
        break;
      case 'YEARLY':
        interval = 'YEARLY';
        break;
      case 'BIANNUAL':
        interval = 'HALF_YEARLY';
        break;
      default:
        interval = 'MONTHLY';
        break;
    }

    const plan: PlanDto = {
      id: planEntity.id,
      name: planEntity.name,
      description: planEntity.description ?? undefined,
      price: planEntity.price,
      currency: planEntity.currency,
      interval,
      active: planEntity.active,
    };

    return {
      id: updated.id,
      status: updated.status as SubscriptionStatusDto,
      plan,
      currentPeriodStart: updated.currentPeriodStart ?? undefined,
      currentPeriodEnd: updated.currentPeriodEnd ?? undefined,
      cancelAtPeriodEnd: updated.cancelAtPeriodEnd,
    };
  }

  async listInvoices(userId: string): Promise<InvoiceDto[]> {
    const companyUser = await this.prisma.companyUser.findUnique({
      where: { id: userId },
    });

    if (!companyUser) {
      throw new NotFoundException('Usuário da empresa não encontrado');
    }

    const invoices = await this.prisma.invoice.findMany({
      where: { companyId: companyUser.companyId },
      orderBy: { createdAt: 'desc' },
    });

    return invoices.map<InvoiceDto>((invoice) => ({
      id: invoice.id,
      amount: invoice.amount,
      currency: invoice.currency,
      status: invoice.status as InvoiceDto['status'],
      dueDate: invoice.dueDate ?? undefined,
      paidAt: invoice.paidAt ?? undefined,
    }));
  }
}
