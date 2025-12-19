import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/module/prisma/prisma.service';
import { SubscriptionDto, InvoiceDto } from '../dto/subscription.dto';
import { PlanDto } from '../../plans/dto/plan.dto';

@Injectable()
export class PrismaSubscriptionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createSubscription(userId: string, plan: PlanDto): Promise<SubscriptionDto> {
    // Primeiro eu preciso descobrir qual é a company vinculada ao usuário
    const companyUser = await this.prisma.companyUser.findFirst({
      where: { userId },
      include: { company: true },
    });

    if (!companyUser) {
      throw new Error('Usuário não está vinculado a nenhuma empresa');
    }

    const now = new Date();

    const subscription = await this.prisma.subscription.create({
      data: {
        status: 'ACTIVE',
        currentPeriodStart: now,
        currentPeriodEnd: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        cancelAtPeriodEnd: false,
        companyId: companyUser.companyId,
        planId: plan.id,
      },
      include: {
        plan: true,
      },
    });

    await this.prisma.invoice.create({
      data: {
        amount: plan.price,
        currency: plan.currency,
        status: 'PAID',
        paidAt: now,
        subscriptionId: subscription.id,
      },
    });

    return {
      id: subscription.id,
      status: subscription.status,
      plan: {
        id: subscription.plan.id,
        name: subscription.plan.name,
        description: subscription.plan.description ?? undefined,
        price: subscription.plan.price,
        currency: subscription.plan.currency,
        interval: subscription.plan.interval,
        active: subscription.plan.active,
      },
      currentPeriodStart: subscription.currentPeriodStart ?? undefined,
      currentPeriodEnd: subscription.currentPeriodEnd ?? undefined,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    };
  }

  async findCurrentByUserId(userId: string): Promise<SubscriptionDto | null> {
    const companyUser = await this.prisma.companyUser.findFirst({
      where: { userId },
    });

    if (!companyUser) return null;

    const subscription = await this.prisma.subscription.findFirst({
      where: {
        companyId: companyUser.companyId,
        status: { in: ['ACTIVE', 'PENDING', 'PAST_DUE'] },
      },
      orderBy: { createdAt: 'desc' },
      include: { plan: true },
    });

    if (!subscription) return null;

    return {
      id: subscription.id,
      status: subscription.status,
      plan: {
        id: subscription.plan.id,
        name: subscription.plan.name,
        description: subscription.plan.description ?? undefined,
        price: subscription.plan.price,
        currency: subscription.plan.currency,
        interval: subscription.plan.interval,
        active: subscription.plan.active,
      },
      currentPeriodStart: subscription.currentPeriodStart ?? undefined,
      currentPeriodEnd: subscription.currentPeriodEnd ?? undefined,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    };
  }

  async cancelCurrent(
    userId: string,
    cancelAtPeriodEnd: boolean,
  ): Promise<SubscriptionDto | null> {
    const current = await this.findCurrentByUserId(userId);
    if (!current) return null;

    const updated = await this.prisma.subscription.update({
      where: { id: current.id },
      data: cancelAtPeriodEnd
        ? { cancelAtPeriodEnd: true }
        : { status: 'CANCELED' },
      include: { plan: true },
    });

    return {
      id: updated.id,
      status: updated.status,
      plan: {
        id: updated.plan.id,
        name: updated.plan.name,
        description: updated.plan.description ?? undefined,
        price: updated.plan.price,
        currency: updated.plan.currency,
        interval: updated.plan.interval,
        active: updated.plan.active,
      },
      currentPeriodStart: updated.currentPeriodStart ?? undefined,
      currentPeriodEnd: updated.currentPeriodEnd ?? undefined,
      cancelAtPeriodEnd: updated.cancelAtPeriodEnd,
    };
  }

  async listInvoicesByUserId(userId: string): Promise<InvoiceDto[]> {
    const companyUser = await this.prisma.companyUser.findFirst({
      where: { userId },
    });

    if (!companyUser) return [];

    const invoices = await this.prisma.invoice.findMany({
      where: {
        subscription: {
          companyId: companyUser.companyId,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return invoices.map<InvoiceDto>((inv) => ({
      id: inv.id,
      amount: inv.amount,
      currency: inv.currency,
      status: inv.status,
      dueDate: inv.dueDate ?? undefined,
      paidAt: inv.paidAt ?? undefined,
    }));
  }
}
