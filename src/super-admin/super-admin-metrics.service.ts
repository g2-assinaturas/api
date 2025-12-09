import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/module/prisma/prisma.service';
import { SubscriptionStatus, InvoiceStatus } from '@prisma/client';

@Injectable()
export class SuperAdminMetricsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardMetrics() {
    const [
      totalCompanies,
      activeCompanies,
      totalSubscriptions,
      activeSubscriptions,
      totalRevenue,
      mrr,
      recentCompanies,
      recentSubscriptions,
    ] = await Promise.all([
      this.getCompanyCount(),
      this.getActiveCompanyCount(),
      this.getSubscriptionCount(),
      this.getActiveSubscriptionCount(),
      this.getTotalRevenue(),
      this.getMonthlyRecurringRevenue(),
      this.getRecentCompanies(),
      this.getRecentSubscriptions(),
    ]);

    return {
      companies: {
        total: totalCompanies,
        active: activeCompanies,
        inactive: totalCompanies - activeCompanies,
      },
      subscriptions: {
        total: totalSubscriptions,
        active: activeSubscriptions,
      },
      revenue: {
        total: totalRevenue,
        mrr,
        currency: 'BRL',
      },
      recent: {
        companies: recentCompanies,
        subscriptions: recentSubscriptions,
      },
      timestamp: new Date().toISOString(),
    };
  }

  private async getCompanyCount() {
    return this.prisma.company.count();
  }

  private async getActiveCompanyCount() {
    return this.prisma.company.count({
      where: { isActive: true },
    });
  }

  private async getSubscriptionCount() {
    return this.prisma.subscription.count();
  }

  private async getActiveSubscriptionCount() {
    return this.prisma.subscription.count({
      where: {
        status: {
          in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING],
        },
      },
    });
  }

  private async getTotalRevenue() {
    const result = await this.prisma.invoice.aggregate({
      where: {
        status: InvoiceStatus.PAID,
      },
      _sum: {
        amount: true,
      },
    });

    return result._sum.amount || 0;
  }

  private async getMonthlyRecurringRevenue() {
    // MRR = soma dos valores de todas as assinaturas ativas com intervalo mensal
    // Para intervalos diferentes, normalizar para mensal
    const activeSubscriptions = await this.prisma.subscription.findMany({
      where: {
        status: {
          in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING],
        },
      },
      include: {
        plan: {
          select: {
            price: true,
            interval: true,
          },
        },
      },
    });

    let mrr = 0;

    for (const sub of activeSubscriptions) {
      const price = sub.plan.price;
      const interval = sub.plan.interval;

      switch (interval) {
        case 'MONTHLY':
          mrr += price;
          break;
        case 'QUARTERLY':
          mrr += price / 3;
          break;
        case 'BIANNUAL':
          mrr += price / 6;
          break;
        case 'YEARLY':
          mrr += price / 12;
          break;
        case 'WEEKLY':
          mrr += price * 4;
          break;
        case 'DAILY':
          mrr += price * 30;
          break;
        default:
          mrr += price; // fallback
      }
    }

    return Math.round(mrr);
  }

  private async getRecentCompanies() {
    return this.prisma.company.findMany({
      take: 5,
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            subscriptions: true,
            users: true,
          },
        },
      },
    });
  }

  private async getRecentSubscriptions() {
    return this.prisma.subscription.findMany({
      take: 5,
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        plan: {
          select: {
            id: true,
            name: true,
            price: true,
            interval: true,
          },
        },
      },
    });
  }

  async getRevenueReport(startDate?: Date, endDate?: Date) {
    const where: any = {
      status: InvoiceStatus.PAID,
    };

    if (startDate || endDate) {
      where.paidAt = {};
      if (startDate) {
        where.paidAt.gte = startDate;
      }
      if (endDate) {
        where.paidAt.lte = endDate;
      }
    }

    const [invoices, totalRevenue, avgRevenue] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        select: {
          id: true,
          amount: true,
          currency: true,
          paidAt: true,
          company: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          paidAt: 'desc',
        },
      }),
      this.prisma.invoice.aggregate({
        where,
        _sum: {
          amount: true,
        },
      }),
      this.prisma.invoice.aggregate({
        where,
        _avg: {
          amount: true,
        },
      }),
    ]);

    return {
      invoices,
      summary: {
        total: totalRevenue._sum.amount || 0,
        average: Math.round(avgRevenue._avg.amount || 0),
        count: invoices.length,
        currency: 'BRL',
      },
      period: {
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
      },
    };
  }

  async getChurnRate(periodMonths: number = 1) {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setMonth(startDate.getMonth() - periodMonths);

    const [subscribersAtStart, canceledInPeriod] = await Promise.all([
      this.prisma.subscription.count({
        where: {
          createdAt: {
            lte: startDate,
          },
          status: {
            in: [
              SubscriptionStatus.ACTIVE,
              SubscriptionStatus.TRIALING,
              SubscriptionStatus.CANCELED,
              SubscriptionStatus.EXPIRED,
            ],
          },
        },
      }),
      this.prisma.subscription.count({
        where: {
          status: {
            in: [SubscriptionStatus.CANCELED, SubscriptionStatus.EXPIRED],
          },
          updatedAt: {
            gte: startDate,
            lte: now,
          },
        },
      }),
    ]);

    const churnRate =
      subscribersAtStart > 0
        ? (canceledInPeriod / subscribersAtStart) * 100
        : 0;

    return {
      churnRate: Math.round(churnRate * 100) / 100,
      subscribersAtStart,
      canceledInPeriod,
      periodMonths,
    };
  }
}
