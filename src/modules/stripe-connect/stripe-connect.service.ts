import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from 'src/module/prisma/prisma.service';
import 'dotenv/config';

@Injectable()
export class StripeConnectService {
  private readonly logger = new Logger(StripeConnectService.name);
  private stripe: Stripe;

  constructor(private readonly prisma: PrismaService) {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) {
      throw new Error('STRIPE_SECRET_KEY não configurada no ambiente');
    }

    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-11-17.clover',
    });
  }

  async createConnectedAccount(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new BadRequestException('Empresa não encontrada');
    }

    if (company.stripeAccountId) {
      return company.stripeAccountId;
    }

    try {
      // AQUI ESTÁ A MUDANÇA: Corrigir os tipos dos parâmetros do Stripe Account
      const accountParams: Stripe.AccountCreateParams = {
        type: 'express',
        country: 'BR',
        email: company.email,
        business_type: 'company',
        company: {
          name: company.name,
          tax_id: company.cnpj || undefined, // AQUI: Converter null para undefined
        },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        settings: {
          payouts: {
            schedule: {
              interval: 'manual',
            },
          },
        },
      };

      const account = await this.stripe.accounts.create(accountParams);

      // AQUI ESTÁ A MUDANÇA: Atualizar schema precisa adicionar campos primeiro
      // Mas vamos usar um update mais seguro
      await this.prisma.company.update({
        where: { id: companyId },
        data: {
          stripeAccountId: account.id,
          // AQUI: Usar Json para status temporariamente
          stripeAccountStatus: account.charges_enabled ? 'active' : 'pending',
        } as any, // AQUI: Cast temporário até atualizar o schema
      });

      this.logger.log(
        `Conta Stripe Connect criada para empresa ${companyId}: ${account.id}`,
      );

      return account.id;
    } catch (error) {
      this.logger.error(`Erro ao criar conta Stripe Connect: ${error.message}`);
      throw new BadRequestException(
        'Erro ao configurar pagamentos para esta empresa',
      );
    }
  }

  async createAccountLink(
    companyId: string,
    returnUrl: string,
    refreshUrl: string,
  ) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company || !company.stripeAccountId) {
      throw new BadRequestException(
        'Empresa não possui conta Stripe configurada',
      );
    }

    try {
      const accountLink = await this.stripe.accountLinks.create({
        account: company.stripeAccountId,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: 'account_onboarding',
      });

      return {
        url: accountLink.url,
        expiresAt: accountLink.expires_at,
      };
    } catch (error) {
      this.logger.error(`Erro ao criar link de onboarding: ${error.message}`);
      throw new BadRequestException('Erro ao gerar link de configuração');
    }
  }

  async getAccountStatus(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company || !company.stripeAccountId) {
      return { hasAccount: false, status: 'not_configured' };
    }

    try {
      const account = await this.stripe.accounts.retrieve(
        company.stripeAccountId,
      );

      await this.prisma.company.update({
        where: { id: companyId },
        data: {
          stripeAccountStatus: account.charges_enabled ? 'active' : 'pending',
        } as any,
      });

      return {
        hasAccount: true,
        status: account.charges_enabled ? 'active' : 'pending',
        details_submitted: account.details_submitted,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        requirements: account.requirements,
      };
    } catch (error) {
      this.logger.error(`Erro ao verificar status da conta: ${error.message}`);
      return { hasAccount: true, status: 'error' };
    }
  }

  async createCheckoutSessionForCompany(params: {
    companyId: string;
    priceId: string;
    customerEmail?: string;
    customerId?: string;
    successUrl: string;
    cancelUrl: string;
    metadata?: Record<string, string>;
  }) {
    const company = await this.prisma.company.findUnique({
      where: { id: params.companyId },
    });

    if (!company || !company.stripeAccountId) {
      throw new BadRequestException(
        'Empresa não configurada para receber pagamentos',
      );
    }

    const accountStatus = await this.getAccountStatus(params.companyId);
    if (accountStatus.status !== 'active') {
      throw new BadRequestException(
        'Empresa não está pronta para receber pagamentos. Complete o cadastro no Stripe.',
      );
    }

    try {
      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        mode: 'subscription',
        line_items: [
          {
            price: params.priceId,
            quantity: 1,
          },
        ],
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        metadata: params.metadata || {},
        payment_method_types: ['card'],
        ...(params.customerEmail
          ? { customer_email: params.customerEmail }
          : {}),
        ...(params.customerId ? { customer: params.customerId } : {}),
      };

      const session = await this.stripe.checkout.sessions.create(
        sessionParams,
        {
          stripeAccount: company.stripeAccountId,
        },
      );

      this.logger.log(
        `Checkout session criada para empresa ${params.companyId}: ${session.id}`,
      );

      return {
        sessionId: session.id,
        url: session.url,
        expiresAt: session.expires_at,
      };
    } catch (error) {
      this.logger.error(
        `Erro ao criar checkout session para empresa: ${error.message}`,
      );
      throw new BadRequestException('Erro ao criar sessão de pagamento');
    }
  }

  async createProductAndPriceForCompany(params: {
    companyId: string;
    name: string;
    description?: string;
    amount: number;
    currency: string;
    interval: 'month' | 'year' | 'week' | 'day';
    intervalCount?: number;
  }) {
    const company = await this.prisma.company.findUnique({
      where: { id: params.companyId },
    });

    if (!company || !company.stripeAccountId) {
      throw new BadRequestException(
        'Empresa não configurada para receber pagamentos',
      );
    }

    try {
      const product = await this.stripe.products.create(
        {
          name: params.name,
          description: params.description,
        },
        {
          stripeAccount: company.stripeAccountId,
        },
      );

      const price = await this.stripe.prices.create(
        {
          product: product.id,
          unit_amount: params.amount,
          currency: params.currency.toLowerCase(),
          recurring: {
            interval: params.interval,
            interval_count: params.intervalCount || 1,
          },
        },
        {
          stripeAccount: company.stripeAccountId,
        },
      );

      this.logger.log(
        `Produto e preço criados para empresa ${params.companyId}: ${product.id}, ${price.id}`,
      );

      return {
        productId: product.id,
        priceId: price.id,
      };
    } catch (error) {
      this.logger.error(
        `Erro ao criar produto/preço para empresa: ${error.message}`,
      );
      throw new BadRequestException('Erro ao criar produto de assinatura');
    }
  }

  constructWebhookEventForAccount(
    payload: string | Buffer,
    signature: string,
    companyStripeAccountId: string,
  ): Stripe.Event {
    try {
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

      if (!webhookSecret) {
        throw new Error('STRIPE_WEBHOOK_SECRET não configurado');
      }

      return this.stripe.webhooks.constructEvent(
        payload,
        signature,
        webhookSecret,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao construir webhook event para conta ${companyStripeAccountId}: ${error.message}`,
      );
      throw error;
    }
  }
}
