import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/module/prisma/prisma.service';
import Stripe from 'stripe';
import { SubscriptionStatus, InvoiceStatus } from '@prisma/client';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(private readonly prisma: PrismaService) {}

  //Processa um evento do webhook do Stripe

  async processStripeEvent(event: Stripe.Event): Promise<void> {
    this.logger.log(`Processando evento: ${event.type} (${event.id})`);

    // Salva o evento no banco para auditoria
    const webhookEvent = await this.prisma.webhookEvent.create({
      data: {
        type: event.type,
        payload: event as any,
        processed: false,
      },
    });

    try {
      // Processa o evento baseado no tipo
      switch (event.type) {
        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(
            event.data.object as Stripe.Subscription,
          );
          break;

        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(
            event.data.object as Stripe.Subscription,
          );
          break;

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(
            event.data.object as Stripe.Subscription,
          );
          break;

        case 'invoice.paid':
          await this.handleInvoicePaid(event.data.object as Stripe.Invoice);
          break;

        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(
            event.data.object as Stripe.Invoice,
          );
          break;

        case 'invoice.payment_action_required':
          await this.handleInvoicePaymentActionRequired(
            event.data.object as Stripe.Invoice,
          );
          break;

        default:
          this.logger.warn(`Evento não tratado: ${event.type}`);
      }

      // Marca como processado com sucesso
      await this.prisma.webhookEvent.update({
        where: { id: webhookEvent.id },
        data: { processed: true },
      });

      this.logger.log(`Evento ${event.type} processado com sucesso`);
    } catch (error) {
      this.logger.error(
        `Erro ao processar evento ${event.type}:`,
        error.message,
      );

      // Salva o erro no banco
      await this.prisma.webhookEvent.update({
        where: { id: webhookEvent.id },
        data: {
          processed: false,
          processingError: error.message,
        },
      });

      throw error;
    }
  }

  //Handler: Assinatura criada no Stripe
 
  private async handleSubscriptionCreated(
    subscription: Stripe.Subscription,
  ): Promise<void> {
    this.logger.log(`Assinatura criada: ${subscription.id}`);

    // Busca assinatura no banco pelo stripeSubscriptionId
    const existingSubscription = await this.prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscription.id },
    });

    if (!existingSubscription) {
      this.logger.warn(
        `Assinatura ${subscription.id} não encontrada no banco. Pode ter sido criada externamente.`,
      );
      return;
    }

    // Atualiza status
    const sub = subscription as any;
    await this.prisma.subscription.update({
      where: { id: existingSubscription.id },
      data: {
        status: this.mapStripeStatus(subscription.status),
        currentPeriodStart: sub.current_period_start
          ? new Date(sub.current_period_start * 1000)
          : undefined,
        currentPeriodEnd: sub.current_period_end
          ? new Date(sub.current_period_end * 1000)
          : undefined,
      },
    });
  }

  //Handler: Assinatura atualizada no Stripe

  private async handleSubscriptionUpdated(
    subscription: Stripe.Subscription,
  ): Promise<void> {
    this.logger.log(`Assinatura atualizada: ${subscription.id}`);

    const existingSubscription = await this.prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscription.id },
    });

    if (!existingSubscription) {
      this.logger.warn(
        `Assinatura ${subscription.id} não encontrada no banco`,
      );
      return;
    }

    // Atualiza dados da assinatura
    const sub = subscription as any;
    await this.prisma.subscription.update({
      where: { id: existingSubscription.id },
      data: {
        status: this.mapStripeStatus(subscription.status),
        currentPeriodStart: sub.current_period_start
          ? new Date(sub.current_period_start * 1000)
          : undefined,
        currentPeriodEnd: sub.current_period_end
          ? new Date(sub.current_period_end * 1000)
          : undefined,
        cancelAtPeriodEnd: sub.cancel_at_period_end || false,
      },
    });
  }

  //Handler: Assinatura cancelada no Stripe
 
  private async handleSubscriptionDeleted(
    subscription: Stripe.Subscription,
  ): Promise<void> {
    this.logger.log(`Assinatura cancelada: ${subscription.id}`);

    const existingSubscription = await this.prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscription.id },
    });

    if (!existingSubscription) {
      this.logger.warn(
        `Assinatura ${subscription.id} não encontrada no banco`,
      );
      return;
    }

    // Marca como cancelada
    await this.prisma.subscription.update({
      where: { id: existingSubscription.id },
      data: {
        status: SubscriptionStatus.CANCELED,
        cancelAtPeriodEnd: false,
        currentPeriodEnd: new Date(),
      },
    });
  }

  //Handler: Fatura paga

  private async handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
    this.logger.log(`Fatura paga: ${invoice.id}`);

    const inv = invoice as any;
    const subscriptionId =
      typeof inv.subscription === 'string'
        ? inv.subscription
        : inv.subscription?.id;

    if (!subscriptionId) {
      this.logger.warn('Fatura não está associada a uma assinatura');
      return;
    }

    // Busca assinatura
    const subscription = await this.prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscriptionId },
    });

    if (!subscription) {
      this.logger.warn(
        `Assinatura ${subscriptionId} não encontrada no banco`,
      );
      return;
    }

    // Verifica se fatura já existe
    const existingInvoice = await this.prisma.invoice.findUnique({
      where: { stripeInvoiceId: invoice.id },
    });

    const paymentIntentId =
      typeof inv.payment_intent === 'string'
        ? inv.payment_intent
        : inv.payment_intent?.id;

    if (existingInvoice) {
      // Atualiza fatura existente
      await this.prisma.invoice.update({
        where: { id: existingInvoice.id },
        data: {
          status: InvoiceStatus.PAID,
          paidAt: invoice.status_transitions?.paid_at
            ? new Date(invoice.status_transitions.paid_at * 1000)
            : new Date(),
          stripePaymentIntentId: paymentIntentId || undefined,
        },
      });
    } else {
      // Cria nova fatura
      await this.prisma.invoice.create({
        data: {
          amount: invoice.amount_paid,
          currency: invoice.currency.toUpperCase(),
          status: InvoiceStatus.PAID,
          dueDate: invoice.due_date
            ? new Date(invoice.due_date * 1000)
            : undefined,
          paidAt: invoice.status_transitions?.paid_at
            ? new Date(invoice.status_transitions.paid_at * 1000)
            : new Date(),
          stripeInvoiceId: invoice.id,
          stripePaymentIntentId: paymentIntentId || undefined,
          subscriptionId: subscription.id,
          companyId: subscription.companyId,
        },
      });
    }

    // Atualiza status da assinatura para ACTIVE se estava PENDING
    if (subscription.status === SubscriptionStatus.PENDING) {
      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: SubscriptionStatus.ACTIVE },
      });
    }
  }

  //Handler: Falha no pagamento da fatura
 
  private async handleInvoicePaymentFailed(
    invoice: Stripe.Invoice,
  ): Promise<void> {
    this.logger.error(`Falha no pagamento da fatura: ${invoice.id}`);

    const inv = invoice as any;
    const subscriptionId =
      typeof inv.subscription === 'string'
        ? inv.subscription
        : inv.subscription?.id;

    if (!subscriptionId) {
      this.logger.warn('Fatura não está associada a uma assinatura');
      return;
    }

    // Busca assinatura
    const subscription = await this.prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscriptionId },
    });

    if (!subscription) {
      this.logger.warn(
        `Assinatura ${subscriptionId} não encontrada no banco`,
      );
      return;
    }

    // Atualiza status da assinatura
    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: SubscriptionStatus.PAYMENT_FAILED },
    });

    // Atualiza ou cria fatura com status de falha
    const existingInvoice = await this.prisma.invoice.findUnique({
      where: { stripeInvoiceId: invoice.id },
    });

    const paymentIntentId =
      typeof inv.payment_intent === 'string'
        ? inv.payment_intent
        : inv.payment_intent?.id;

    if (existingInvoice) {
      await this.prisma.invoice.update({
        where: { id: existingInvoice.id },
        data: { status: InvoiceStatus.UNCOLLECTIBLE },
      });
    } else {
      await this.prisma.invoice.create({
        data: {
          amount: invoice.amount_due,
          currency: invoice.currency.toUpperCase(),
          status: InvoiceStatus.UNCOLLECTIBLE,
          dueDate: invoice.due_date
            ? new Date(invoice.due_date * 1000)
            : undefined,
          stripeInvoiceId: invoice.id,
          stripePaymentIntentId: paymentIntentId || undefined,
          subscriptionId: subscription.id,
          companyId: subscription.companyId,
        },
      });
    }
  }

  //Handler: Ação necessária para pagamento (ex: 3D Secure)
 
  private async handleInvoicePaymentActionRequired(
    invoice: Stripe.Invoice,
  ): Promise<void> {
    this.logger.warn(`Ação necessária para fatura: ${invoice.id}`);

    const inv = invoice as any;
    const subscriptionId =
      typeof inv.subscription === 'string'
        ? inv.subscription
        : inv.subscription?.id;

    if (!subscriptionId) {
      return;
    }

    const subscription = await this.prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscriptionId },
    });

    if (!subscription) {
      return;
    }

    // Marca como PAST_DUE até a ação ser completada
    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: SubscriptionStatus.PAST_DUE },
    });
  }

  //Mapeia status do Stripe para o enum do banco
 
  private mapStripeStatus(
    stripeStatus: Stripe.Subscription.Status,
  ): SubscriptionStatus {
    const statusMap: Record<Stripe.Subscription.Status, SubscriptionStatus> = {
      active: SubscriptionStatus.ACTIVE,
      canceled: SubscriptionStatus.CANCELED,
      incomplete: SubscriptionStatus.PENDING,
      incomplete_expired: SubscriptionStatus.EXPIRED,
      past_due: SubscriptionStatus.PAST_DUE,
      trialing: SubscriptionStatus.TRIALING,
      unpaid: SubscriptionStatus.PAYMENT_FAILED,
      paused: SubscriptionStatus.PENDING,
    };

    return statusMap[stripeStatus] || SubscriptionStatus.PENDING;
  }
}
