import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/module/prisma/prisma.service';
import { InvoiceStatus } from '@prisma/client';

@Injectable()
export class SuperAdminInvoiceService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllInvoices(filters?: {
    status?: InvoiceStatus;
    companyId?: string;
  }) {
    const where: any = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.companyId) {
      where.companyId = filters.companyId;
    }

    const invoices = await this.prisma.invoice.findMany({
      where,
      include: {
        company: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        subscription: {
          select: {
            id: true,
            status: true,
            plan: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return invoices;
  }

  async findInvoiceById(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        company: {
          include: {
            address: true,
          },
        },
        subscription: {
          include: {
            plan: true,
            customer: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Fatura ${id} não encontrada`);
    }

    return invoice;
  }

  async updateInvoiceStatus(id: string, status: InvoiceStatus) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
    });

    if (!invoice) {
      throw new NotFoundException(`Fatura ${id} não encontrada`);
    }

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: {
        status,
        ...(status === InvoiceStatus.PAID && {
          paidAt: new Date(),
        }),
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return {
      message: `Status da fatura atualizado para ${status}`,
      invoice: updated,
    };
  }

  async getInvoiceStats() {
    const [totalInvoices, paidInvoices, openInvoices, voidInvoices] =
      await Promise.all([
        this.prisma.invoice.count(),
        this.prisma.invoice.count({
          where: { status: InvoiceStatus.PAID },
        }),
        this.prisma.invoice.count({
          where: { status: InvoiceStatus.OPEN },
        }),
        this.prisma.invoice.count({
          where: { status: InvoiceStatus.VOID },
        }),
      ]);

    const totalAmount = await this.prisma.invoice.aggregate({
      where: { status: InvoiceStatus.PAID },
      _sum: {
        amount: true,
      },
    });

    return {
      total: totalInvoices,
      paid: paidInvoices,
      open: openInvoices,
      void: voidInvoices,
      totalPaidAmount: totalAmount._sum.amount || 0,
    };
  }
}
