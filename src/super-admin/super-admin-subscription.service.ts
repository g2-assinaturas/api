import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/module/prisma/prisma.service';
import {
  SubscriptionFilterDto,
  UpdateSubscriptionStatusDto,
} from './dto/subscription-filter.dto';
import { SubscriptionStatus } from '@prisma/client';

@Injectable()
export class SuperAdminSubscriptionService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllSubscriptions(filters?: SubscriptionFilterDto) {
    const where: any = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.companyId) {
      where.companyId = filters.companyId;
    }

    if (filters?.planId) {
      where.planId = filters.planId;
    }

    const subscriptions = await this.prisma.subscription.findMany({
      where,
      include: {
        company: {
          select: {
            id: true,
            name: true,
            email: true,
            cnpj: true,
            isActive: true,
          },
        },
        plan: {
          select: {
            id: true,
            name: true,
            price: true,
            currency: true,
            interval: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            invoices: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return subscriptions;
  }

  async findSubscriptionById(id: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id },
      include: {
        company: {
          include: {
            address: true,
          },
        },
        plan: true,
        customer: true,
        invoices: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 10,
        },
      },
    });

    if (!subscription) {
      throw new NotFoundException(`Assinatura ${id} não encontrada`);
    }

    return subscription;
  }

  async updateSubscriptionStatus(
    id: string,
    data: UpdateSubscriptionStatusDto,
  ) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id },
    });

    if (!subscription) {
      throw new NotFoundException(`Assinatura ${id} não encontrada`);
    }

    const updated = await this.prisma.subscription.update({
      where: { id },
      data: {
        status: data.status,
        ...(data.status === SubscriptionStatus.CANCELED && {
          cancelAtPeriodEnd: false,
          currentPeriodEnd: new Date(),
        }),
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        plan: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return {
      message: `Status da assinatura atualizado para ${data.status}`,
      subscription: updated,
    };
  }

  async deleteSubscription(id: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id },
      include: {
        invoices: true,
      },
    });

    if (!subscription) {
      throw new NotFoundException(`Assinatura ${id} não encontrada`);
    }

    // Delete relacionamentos primeiro
    await this.prisma.invoice.deleteMany({
      where: { subscriptionId: id },
    });

    // Delete a assinatura
    await this.prisma.subscription.delete({
      where: { id },
    });

    return {
      message: 'Assinatura deletada com sucesso',
      deletedInvoices: subscription.invoices.length,
    };
  }

  async getSubscriptionStats() {
    const [
      totalSubscriptions,
      activeSubscriptions,
      canceledSubscriptions,
      expiredSubscriptions,
      pendingSubscriptions,
    ] = await Promise.all([
      this.prisma.subscription.count(),
      this.prisma.subscription.count({
        where: { status: SubscriptionStatus.ACTIVE },
      }),
      this.prisma.subscription.count({
        where: { status: SubscriptionStatus.CANCELED },
      }),
      this.prisma.subscription.count({
        where: { status: SubscriptionStatus.EXPIRED },
      }),
      this.prisma.subscription.count({
        where: { status: SubscriptionStatus.PENDING },
      }),
    ]);

    return {
      total: totalSubscriptions,
      active: activeSubscriptions,
      canceled: canceledSubscriptions,
      expired: expiredSubscriptions,
      pending: pendingSubscriptions,
    };
  }
}
