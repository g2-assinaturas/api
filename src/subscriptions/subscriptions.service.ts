import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { PlansService } from '../plans/plans.service';
import {
  CancelSubscriptionDto,
  SubscriptionStatusDto,
  InvoiceDto,
} from './dto/subscription.dto';
import { PrismaService } from 'src/module/prisma/prisma.service';
import { PlanDto, PlanIntervalDto } from '../plans/dto/plan.dto';
import { StripeService } from '../modules/stripe/stripe.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    private readonly plansService: PlansService,
    private readonly prisma: PrismaService,
    private readonly stripeService: StripeService,
  ) {}

  async listPlans() {
    const plans = await this.prisma.plan.findMany({
      where: { active: true },
      include: { company: true },
    });

    return plans.map((plan) => {
      const interval = plan.interval as PlanIntervalDto;

      return {
        id: plan.id,
        name: plan.name,
        description: plan.description ?? undefined,
        price: plan.price / 100,
        currency: plan.currency,
        interval,
        active: plan.active,
        companyName: plan.company.name,
        stripePriceId: plan.stripePriceId, // AQUI ESTÁ A MUDANÇA: Incluir stripePriceId
      };
    });
  }

  // AQUI ESTÁ A MUDANÇA: Novo método para criar checkout session
  async createCheckoutSession(userId: string, data: CreateCheckoutDto) {
    const planEntity = await this.prisma.plan.findUnique({
      where: { id: data.planId },
      include: { company: true },
    });

    if (!planEntity) {
      throw new NotFoundException('Plano não encontrado');
    }

    if (!planEntity.active) {
      throw new BadRequestException('Este plano não está mais disponível');
    }

    const companyUser = await this.prisma.companyUser.findUnique({
      where: { id: userId },
      include: { company: true },
    });

    if (!companyUser) {
      throw new NotFoundException('Usuário da empresa não encontrado');
    }

    // Verifica se já existe uma assinatura ativa para evitar duplicatas
    const existingSubscription = await this.prisma.subscription.findFirst({
      where: {
        companyId: companyUser.companyId,
        status: {
          in: ['ACTIVE', 'TRIALING', 'PAST_DUE', 'PENDING'],
        },
      },
    });

    if (existingSubscription) {
      throw new BadRequestException(
        'Esta empresa já possui uma assinatura ativa ou pendente',
      );
    }

    // Garante que existe um Customer no banco
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

    let stripeCustomerId: string | null = null;
    let stripePriceId: string | null = planEntity.stripePriceId;

    // AQUI ESTÁ A MUDANÇA: Se Stripe não estiver configurado, retornar erro
    if (!this.stripeService.isConfigured()) {
      throw new BadRequestException(
        'Sistema de pagamento não configurado. Entre em contato com o suporte.',
      );
    }

    this.logger.log('Criando checkout session no Stripe');

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

      const stripeProduct = await this.stripeService.createProduct({
        name: planEntity.name,
        description: planEntity.description || undefined,
        metadata: {
          planId: planEntity.id,
          companyId: planEntity.companyId,
        },
      });

      const stripeIntervalConfig = this.stripeService.mapSystemIntervalToStripe(
        planEntity.interval,
      );

      const unitAmountInCents = planEntity.price;

      const stripePrice = await this.stripeService.createPrice({
        productId: stripeProduct.id,
        unitAmount: unitAmountInCents,
        currency: planEntity.currency.toLowerCase(),
        interval: stripeIntervalConfig.interval,
        intervalCount: stripeIntervalConfig.intervalCount,
        metadata: {
          planId: planEntity.id,
          companyId: planEntity.companyId,
        },
      });

      stripePriceId = stripePrice.id;

      await this.prisma.plan.update({
        where: { id: planEntity.id },
        data: {
          stripeProductId: stripeProduct.id,
          stripePriceId: stripePrice.id,
        },
      });
    }

    // AQUI ESTÁ A MUDANÇA: URLs padrão para ambiente de teste
    const defaultSuccessUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/subscription/success?session_id={CHECKOUT_SESSION_ID}`;
    const defaultCancelUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/subscription/cancel`;

    // Cria a sessão de checkout no Stripe
    let checkoutSession;
    try {
      checkoutSession = await this.stripeService.createCheckoutSession({
        customerId: stripeCustomerId,
        priceId: stripePriceId,
        successUrl: data.successUrl || defaultSuccessUrl,
        cancelUrl: data.cancelUrl || defaultCancelUrl,
        metadata: {
          companyId: companyUser.companyId,
          companyName: companyUser.company.name,
          planId: planEntity.id,
          customerId: customer.id,
          userId: companyUser.id,
        },
        mode: 'subscription',
        allowPromotionCodes: true,
        subscriptionData: {
          metadata: {
            companyId: companyUser.companyId,
            planId: planEntity.id,
            customerId: customer.id,
          },
        },
      });
    } catch (error) {
      this.logger.error(`Erro ao criar checkout session: ${error.message}`);
      throw new BadRequestException('Erro ao criar sessão de pagamento');
    }

    const subscription = await this.prisma.subscription.create({
      data: {
        status: 'PENDING',
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        stripeSubscriptionId: null,
        stripeCustomerId,
        stripePriceId,
        customerId: customer.id,
        planId: planEntity.id,
        companyId: companyUser.companyId,
        checkoutSessionId: checkoutSession.id,
      },
      include: {
        plan: true,
      },
    });

    this.logger.log(
      `Checkout session criada para assinatura: ${subscription.id}`,
    );

    return {
      subscriptionId: subscription.id,
      checkoutSessionId: checkoutSession.id,
      url: checkoutSession.url,
      expiresAt: checkoutSession.expires_at
        ? new Date(checkoutSession.expires_at * 1000)
        : null,
      metadata: {
        note: 'Use cartões de teste do Stripe para simular pagamento',
        testCards: [
          '4242424242424242 - Pagamento bem-sucedido',
          '4000000000003220 - 3D Secure requerido',
          '4000000000009995 - Falha no pagamento',
        ],
      },
    };
  }

  // AQUI ESTÁ A MUDANÇA: Método para verificar status do checkout
  async getCheckoutStatus(checkoutSessionId: string) {
    if (!this.stripeService.isConfigured()) {
      throw new BadRequestException('Stripe não configurado');
    }

    try {
      const session =
        await this.stripeService.getCheckoutSession(checkoutSessionId);

      // Verifica se há uma assinatura associada a esta sessão
      const subscription = await this.prisma.subscription.findFirst({
        where: {
          OR: [
            { checkoutSessionId },
            { stripeSubscriptionId: session.subscription as string },
          ],
        },
        include: {
          plan: true,
          customer: true,
        },
      });

      return {
        sessionId: session.id,
        status: session.status,
        paymentStatus: session.payment_status,
        subscriptionId: session.subscription,
        customerEmail: session.customer_email,
        amountTotal: session.amount_total ? session.amount_total / 100 : null,
        currency: session.currency,
        expiresAt: session.expires_at
          ? new Date(session.expires_at * 1000)
          : null,
        url: session.url,
        subscription: subscription
          ? {
              id: subscription.id,
              status: subscription.status,
              planName: subscription.plan.name,
            }
          : null,
      };
    } catch (error) {
      this.logger.error(`Erro ao buscar status do checkout: ${error.message}`);
      throw new BadRequestException(
        'Não foi possível verificar o status do checkout',
      );
    }
  }

  // AQUI ESTÁ A MUDANÇA: Método para processar webhooks do Stripe (será chamado pelo webhook controller)
  async handleStripeWebhook(event: any) {
    this.logger.log(`Processando webhook Stripe: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutSessionCompleted(event.data.object);
        break;

      case 'checkout.session.expired':
        await this.handleCheckoutSessionExpired(event.data.object);
        break;

      case 'invoice.payment_succeeded':
        await this.handleInvoicePaymentSucceeded(event.data.object);
        break;

      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(event.data.object);
        break;

      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object);
        break;

      default:
        this.logger.log(`Webhook não tratado: ${event.type}`);
    }
  }

  private async handleCheckoutSessionCompleted(session: any) {
    try {
      const subscription = await this.prisma.subscription.findFirst({
        where: {
          OR: [
            { checkoutSessionId: session.id },
            { customer: { externalId: session.customer as string } },
          ],
        },
      });

      if (subscription) {
        const now = new Date();
        // eslint-disable-next-line prettier/prettier
        const periodEnd = await this.calculatePeriodEnd(subscription.planId, now);

        await this.prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            status: 'ACTIVE',
            stripeSubscriptionId: session.subscription as string,
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            checkoutSessionId: null,
          },
        });

        // Criar fatura inicial
        await this.prisma.invoice.create({
          data: {
            amount: session.amount_total || 0,
            currency: session.currency || 'BRL',
            status: 'PAID',
            dueDate: periodEnd,
            paidAt: now,
            stripeInvoiceId: session.invoice as string,
            subscriptionId: subscription.id,
            companyId: subscription.companyId,
          },
        });

        this.logger.log(
          `Assinatura ${subscription.id} ativada via checkout session`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Erro ao processar checkout.session.completed: ${error.message}`,
      );
    }
  }

  private async handleCheckoutSessionExpired(session: any) {
    try {
      await this.prisma.subscription.updateMany({
        where: {
          checkoutSessionId: session.id,
          status: 'PENDING',
        },
        data: {
          status: 'EXPIRED',
        },
      });

      this.logger.log(`Sessão de checkout expirada: ${session.id}`);
    } catch (error) {
      this.logger.error(
        `Erro ao processar checkout.session.expired: ${error.message}`,
      );
    }
  }

  private async handleInvoicePaymentSucceeded(invoice: any) {
    try {
      const subscription = await this.prisma.subscription.findFirst({
        where: {
          stripeSubscriptionId: invoice.subscription,
        },
      });

      if (subscription) {
        await this.prisma.invoice.create({
          data: {
            amount: invoice.amount_paid,
            currency: invoice.currency,
            status: 'PAID',
            dueDate: new Date(invoice.due_date * 1000),
            paidAt: new Date(invoice.status_transitions.paid_at * 1000),
            stripeInvoiceId: invoice.id,
            subscriptionId: subscription.id,
            companyId: subscription.companyId,
          },
        });

        this.logger.log(
          `Fatura ${invoice.id} processada para assinatura ${subscription.id}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Erro ao processar invoice.payment_succeeded: ${error.message}`,
      );
    }
  }

  private async handleInvoicePaymentFailed(invoice: any) {
    try {
      const subscription = await this.prisma.subscription.findFirst({
        where: {
          stripeSubscriptionId: invoice.subscription,
        },
      });

      if (subscription) {
        await this.prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            status: 'PAYMENT_FAILED',
          },
        });

        await this.prisma.invoice.create({
          data: {
            amount: invoice.amount_due,
            currency: invoice.currency,
            status: 'OPEN',
            dueDate: new Date(invoice.due_date * 1000),
            stripeInvoiceId: invoice.id,
            subscriptionId: subscription.id,
            companyId: subscription.companyId,
          },
        });

        this.logger.log(
          `Falha no pagamento da fatura ${invoice.id} para assinatura ${subscription.id}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Erro ao processar invoice.payment_failed: ${error.message}`,
      );
    }
  }

  private async handleSubscriptionUpdated(subscription: any) {
    try {
      const dbSubscription = await this.prisma.subscription.findFirst({
        where: {
          stripeSubscriptionId: subscription.id,
        },
      });

      if (dbSubscription) {
        const updateData: any = {
          status: subscription.status.toUpperCase(),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        };

        if (subscription.current_period_start) {
          updateData.currentPeriodStart = new Date(
            subscription.current_period_start * 1000,
          );
        }

        if (subscription.current_period_end) {
          updateData.currentPeriodEnd = new Date(
            subscription.current_period_end * 1000,
          );
        }

        await this.prisma.subscription.update({
          where: { id: dbSubscription.id },
          data: updateData,
        });

        this.logger.log(
          `Assinatura ${dbSubscription.id} atualizada via webhook`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Erro ao processar customer.subscription.updated: ${error.message}`,
      );
    }
  }

  private async handleSubscriptionDeleted(subscription: any) {
    try {
      await this.prisma.subscription.updateMany({
        where: {
          stripeSubscriptionId: subscription.id,
        },
        data: {
          status: 'CANCELED',
          cancelAtPeriodEnd: false,
        },
      });

      this.logger.log(
        `Assinatura com stripeId ${subscription.id} cancelada via webhook`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao processar customer.subscription.deleted: ${error.message}`,
      );
    }
  }

  private async calculatePeriodEnd(
    planId: string,
    startDate: Date,
  ): Promise<Date> {
    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      return new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000); // Default 30 dias
    }

    const result = new Date(startDate);

    switch (plan.interval) {
      case 'DAILY':
        result.setDate(result.getDate() + 1);
        break;
      case 'WEEKLY':
        result.setDate(result.getDate() + 7);
        break;
      case 'MONTHLY':
        result.setMonth(result.getMonth() + 1);
        break;
      case 'QUARTERLY':
        result.setMonth(result.getMonth() + 3);
        break;
      case 'BIANNUAL':
        result.setMonth(result.getMonth() + 6);
        break;
      case 'YEARLY':
        result.setFullYear(result.getFullYear() + 1);
        break;
      default:
        result.setMonth(result.getMonth() + 1);
    }

    return result;
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

    const interval = planEntity.interval as PlanIntervalDto;

    const plan: PlanDto = {
      id: planEntity.id,
      name: planEntity.name,
      description: planEntity.description ?? undefined,
      price: planEntity.price / 100,
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

    const interval = planEntity.interval as PlanIntervalDto;

    const plan: PlanDto = {
      id: planEntity.id,
      name: planEntity.name,
      description: planEntity.description ?? undefined,
      price: planEntity.price / 100,
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
