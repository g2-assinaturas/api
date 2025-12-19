import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/module/prisma/prisma.service';

@Injectable()
export class SuperAdminWebhookService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllWebhooks(filters?: {
    processed?: boolean;
    companyId?: string;
    type?: string;
  }) {
    const where: any = {};

    if (filters?.processed !== undefined) {
      where.processed = filters.processed === true;
    }

    if (filters?.companyId) {
      where.companyId = filters.companyId;
    }

    if (filters?.type) {
      where.type = {
        contains: filters.type,
      };
    }

    const webhooks = await this.prisma.webhookEvent.findMany({
      where,
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100,
    });

    return webhooks;
  }

  async findWebhookById(id: string) {
    const webhook = await this.prisma.webhookEvent.findUnique({
      where: { id },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!webhook) {
      throw new NotFoundException(`Webhook ${id} não encontrado`);
    }

    return webhook;
  }

  async retryWebhook(id: string) {
    const webhook = await this.prisma.webhookEvent.findUnique({
      where: { id },
    });

    if (!webhook) {
      throw new NotFoundException(`Webhook ${id} não encontrado`);
    }

    // Marca como não processado para retry
    const updated = await this.prisma.webhookEvent.update({
      where: { id },
      data: {
        processed: false,
        processingError: null,
      },
    });

    return {
      message: 'Webhook marcado para reprocessamento',
      webhook: updated,
    };
  }

  async deleteWebhook(id: string) {
    const webhook = await this.prisma.webhookEvent.findUnique({
      where: { id },
    });

    if (!webhook) {
      throw new NotFoundException(`Webhook ${id} não encontrado`);
    }

    await this.prisma.webhookEvent.delete({
      where: { id },
    });

    return {
      message: 'Webhook deletado com sucesso',
    };
  }

  async getWebhookStats() {
    const [total, processed, failed, pending] = await Promise.all([
      this.prisma.webhookEvent.count(),
      this.prisma.webhookEvent.count({
        where: { processed: true, processingError: null },
      }),
      this.prisma.webhookEvent.count({
        where: { processingError: { not: null } },
      }),
      this.prisma.webhookEvent.count({
        where: { processed: false },
      }),
    ]);

    return {
      total,
      processed,
      failed,
      pending,
    };
  }

  async getWebhookTypes() {
    // Busca todos os tipos únicos de webhooks
    const webhooks = await this.prisma.webhookEvent.findMany({
      select: {
        type: true,
      },
      distinct: ['type'],
    });

    return webhooks.map((w) => w.type);
  }
}
