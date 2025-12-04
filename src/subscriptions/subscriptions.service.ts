import { Injectable, NotFoundException } from '@nestjs/common';
import { PlansService } from '../plans/plans.service';
import {
  CancelSubscriptionDto,
  CheckoutSubscriptionDto,
  SubscriptionStatusDto,
  InvoiceDto,
} from './dto/subscription.dto';
import { PrismaService } from 'src/module/prisma/prisma.service';
import { PlanDto } from '../plans/dto/plan.dto';

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly plansService: PlansService,
    private readonly prisma: PrismaService,
  ) {}

  listPlans() {
    // Aqui eu uso o serviço de planos para centralizar a regra de listagem
    return this.plansService.findAll();
  }

  async checkout(userId: string, data: CheckoutSubscriptionDto) {
    // Primeiro eu preciso garantir que o plano existe
    const plans = await this.plansService.findAll();
    const plan = plans.find((p) => p.id === data.planId);

    if (!plan) {
      throw new NotFoundException('Plano não encontrado');
    }

    // Descobre a empresa/usuário de empresa a partir do userId do token
    const companyUser = await this.prisma.companyUser.findUnique({
      where: { id: userId },
    });

    if (!companyUser) {
      throw new NotFoundException('Usuário da empresa não encontrado');
    }

    // Garante que existe um Customer vinculado à empresa para essa assinatura
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

    const now = new Date();

    // Calcula o fim do período atual de acordo com o intervalo do plano
    let currentPeriodEnd: Date | null = null;
    const baseTime = now.getTime();

    switch (plan.interval) {
      case 'MONTHLY':
        currentPeriodEnd = new Date(baseTime + 30 * 24 * 60 * 60 * 1000); // +30 dias
        break;
      case 'HALF_YEARLY':
        currentPeriodEnd = new Date(baseTime + 182 * 24 * 60 * 60 * 1000); // ~6 meses
        break;
      case 'YEARLY':
        currentPeriodEnd = new Date(baseTime + 365 * 24 * 60 * 60 * 1000); // ~1 ano
        break;
      default:
        currentPeriodEnd = null;
    }

    // Cria a assinatura real no banco
    const subscription = await this.prisma.subscription.create({
      data: {
        status: 'ACTIVE',
        currentPeriodStart: now,
        currentPeriodEnd,
        cancelAtPeriodEnd: false,
        stripeSubscriptionId: null,
        stripeCustomerId: null,
        stripePriceId: null,
        customerId: customer.id,
        planId: plan.id,
        companyId: companyUser.companyId,
      },
      include: {
        plan: true,
      },
    });

    // Cria uma fatura associada a esta assinatura
    await this.prisma.invoice.create({
      data: {
        amount: plan.price,
        currency: plan.currency,
        status: 'PAID', // no futuro pode virar OPEN/PENDING dependendo do gateway
        dueDate: currentPeriodEnd,
        paidAt: now,
        stripeInvoiceId: null,
        stripePaymentIntentId: null,
        subscriptionId: subscription.id,
        companyId: companyUser.companyId,
      },
    });

    // Retorna no formato esperado pelo frontend (SubscriptionDto)
    return {
      id: subscription.id,
      status: subscription.status as SubscriptionStatusDto,
      plan,
      currentPeriodStart: subscription.currentPeriodStart ?? undefined,
      currentPeriodEnd: subscription.currentPeriodEnd ?? undefined,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
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
