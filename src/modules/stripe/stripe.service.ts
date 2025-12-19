import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import 'dotenv/config';

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private stripe: Stripe | null = null;
  private _isConfigured: boolean = false;
  private _apiKey: string | null = null;

  constructor() {
    this.initializeStripe();
  }

  private initializeStripe(): void {
    const apiKey = process.env.STRIPE_SECRET_KEY;

    if (!apiKey) {
      this.logger.warn(
        'STRIPE_SECRET_KEY não configurada. Integração Stripe desabilitada.',
      );
      this._isConfigured = false;
      this.stripe = null;
      return;
    }

    try {
      this.stripe = new Stripe(apiKey, {
        apiVersion: '2025-11-17.clover',
        maxNetworkRetries: 2,
        timeout: 30000,
      });
      this._isConfigured = true;
      this.logger.log(
        'Stripe Service inicializado com sucesso em modo de teste',
      );

      this.validateStripeConnection();
    } catch (error) {
      this.logger.error('Erro ao inicializar Stripe:', error.message);
      this._isConfigured = false;
      this.stripe = null;
    }
  }

  private async validateStripeConnection(): Promise<void> {
    if (!this.stripe) return;

    try {
      const balance = await this.stripe.balance.retrieve();
      this.logger.log(
        `Conexão Stripe validada. Moeda: ${balance.available[0]?.currency || 'N/A'}`,
      );
    } catch (error) {
      this.logger.error('Falha ao validar conexão Stripe:', error.message);
      this._isConfigured = false;
    }
  }

  isConfigured(): boolean {
    return this._isConfigured && !!this.stripe;
  }

  private ensureStripeIsConfigured(): void {
    if (!this._isConfigured || !this.stripe) {
      throw new Error(
        'Stripe não está configurado. Verifique STRIPE_SECRET_KEY no ambiente.',
      );
    }
  }

  private getStripe(): Stripe {
    if (!this.stripe) {
      throw new Error('Stripe não está inicializado');
    }
    return this.stripe;
  }

  async createCustomer(params: {
    email: string;
    name: string;
    metadata?: Record<string, string>;
  }): Promise<Stripe.Customer> {
    this.ensureStripeIsConfigured();
    const stripe = this.getStripe();

    this.logger.log(`Criando customer no Stripe: ${params.email}`);

    try {
      const customer = await stripe.customers.create({
        email: params.email,
        name: params.name,
        metadata: params.metadata || {},
      });

      this.logger.log(`Customer criado no Stripe: ${customer.id}`);
      return customer;
    } catch (error) {
      this.logger.error(`Erro ao criar customer: ${error.message}`);
      throw error;
    }
  }

  async getCustomer(customerId: string): Promise<Stripe.Customer> {
    this.ensureStripeIsConfigured();
    const stripe = this.getStripe();

    return (await stripe.customers.retrieve(customerId)) as Stripe.Customer;
  }

  async updateCustomer(
    customerId: string,
    params: Stripe.CustomerUpdateParams,
  ): Promise<Stripe.Customer> {
    this.ensureStripeIsConfigured();
    const stripe = this.getStripe();

    return await stripe.customers.update(customerId, params);
  }

  async createProduct(params: {
    name: string;
    description?: string;
    metadata?: Record<string, string>;
  }): Promise<Stripe.Product> {
    this.ensureStripeIsConfigured();
    const stripe = this.getStripe();

    this.logger.log(`Criando produto no Stripe: ${params.name}`);

    const product = await stripe.products.create({
      name: params.name,
      description: params.description,
      metadata: params.metadata || {},
    });

    this.logger.log(`Produto criado no Stripe: ${product.id}`);
    return product;
  }

  async createPrice(params: {
    productId: string;
    unitAmount: number;
    currency: string;
    interval: 'day' | 'week' | 'month' | 'year';
    intervalCount?: number;
    metadata?: Record<string, string>;
  }): Promise<Stripe.Price> {
    this.ensureStripeIsConfigured();
    const stripe = this.getStripe();

    this.logger.log(`Criando price no Stripe para produto ${params.productId}`);

    const price = await stripe.prices.create({
      product: params.productId,
      unit_amount: params.unitAmount,
      currency: params.currency.toLowerCase(),
      recurring: {
        interval: params.interval,
        interval_count: params.intervalCount || 1,
      },
      metadata: params.metadata || {},
    });

    this.logger.log(`Price criado no Stripe: ${price.id}`);
    return price;
  }

  mapSystemIntervalToStripe(interval: string): {
    interval: 'day' | 'week' | 'month' | 'year';
    intervalCount: number;
  } {
    switch (interval) {
      case 'DAILY':
        return { interval: 'day', intervalCount: 1 };
      case 'WEEKLY':
        return { interval: 'week', intervalCount: 1 };
      case 'MONTHLY':
        return { interval: 'month', intervalCount: 1 };
      case 'QUARTERLY':
        return { interval: 'month', intervalCount: 3 };
      case 'BIANNUAL':
        return { interval: 'month', intervalCount: 6 };
      case 'YEARLY':
        return { interval: 'year', intervalCount: 1 };
      default:
        return { interval: 'month', intervalCount: 1 };
    }
  }

  async createSubscription(params: {
    customerId: string;
    priceId: string;
    metadata?: Record<string, string>;
    trialPeriodDays?: number;
  }): Promise<Stripe.Subscription> {
    this.ensureStripeIsConfigured();
    const stripe = this.getStripe();

    this.logger.log(
      `Criando subscription no Stripe para customer ${params.customerId}`,
    );

    const subscription = await stripe.subscriptions.create({
      customer: params.customerId,
      items: [{ price: params.priceId }],
      metadata: params.metadata || {},
      trial_period_days: params.trialPeriodDays,
      payment_behavior: 'default_incomplete',
      payment_settings: {
        save_default_payment_method: 'on_subscription',
      },
      expand: ['latest_invoice.payment_intent'],
    });

    this.logger.log(`Subscription criada no Stripe: ${subscription.id}`);
    return subscription;
  }

  async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    this.ensureStripeIsConfigured();
    const stripe = this.getStripe();

    return await stripe.subscriptions.retrieve(subscriptionId);
  }

  async updateSubscription(
    subscriptionId: string,
    params: Stripe.SubscriptionUpdateParams,
  ): Promise<Stripe.Subscription> {
    this.ensureStripeIsConfigured();
    const stripe = this.getStripe();

    return await stripe.subscriptions.update(subscriptionId, params);
  }

  async cancelSubscription(
    subscriptionId: string,
    cancelAtPeriodEnd: boolean = true,
  ): Promise<Stripe.Subscription> {
    this.ensureStripeIsConfigured();
    const stripe = this.getStripe();

    this.logger.log(
      `Cancelando subscription no Stripe: ${subscriptionId} (at_period_end: ${cancelAtPeriodEnd})`,
    );

    if (cancelAtPeriodEnd) {
      return await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
    } else {
      return await stripe.subscriptions.cancel(subscriptionId);
    }
  }

  async createCheckoutSession(params: {
    customerId?: string;
    customerEmail?: string;
    priceId: string;
    successUrl: string;
    cancelUrl: string;
    metadata?: Record<string, string>;
    mode?: 'subscription' | 'payment' | 'setup';
    allowPromotionCodes?: boolean;
    subscriptionData?: {
      trialPeriodDays?: number;
      metadata?: Record<string, string>;
    };
  }): Promise<Stripe.Checkout.Session> {
    const stripe = this.getStripe();

    this.logger.log(`Criando checkout session para price: ${params.priceId}`);

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: params.mode || 'subscription',
      line_items: [
        {
          price: params.priceId,
          quantity: 1,
        },
      ],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: params.metadata || {},
      allow_promotion_codes: params.allowPromotionCodes || true,
      // AQUI ESTÁ A MUDANÇA: Adicionando suporte para customer email quando não há customerId
      ...(params.customerId ? { customer: params.customerId } : {}),
      ...(params.customerEmail && !params.customerId
        ? { customer_email: params.customerEmail }
        : {}),
      // AQUI ESTÁ A MUDANÇA: Configurações de subscription específicas
      ...(params.mode === 'subscription' && params.subscriptionData
        ? {
            subscription_data: {
              trial_period_days: params.subscriptionData.trialPeriodDays,
              metadata: params.subscriptionData.metadata,
            },
          }
        : {}),
      // AQUI ESTÁ A MUDANÇA: Parâmetros importantes para ambiente de teste
      payment_method_types: ['card'],
      billing_address_collection: 'auto',
      shipping_address_collection: {
        allowed_countries: ['BR'],
      },
    };

    try {
      const session = await stripe.checkout.sessions.create(sessionParams);

      this.logger.log(`Checkout session criada: ${session.id}`);
      this.logger.log(`URL de pagamento: ${session.url}`);

      return session;
    } catch (error) {
      this.logger.error(`Erro ao criar checkout session: ${error.message}`);
      throw error;
    }
  }

  async getCheckoutSession(
    sessionId: string,
  ): Promise<Stripe.Checkout.Session> {
    const stripe = this.getStripe();

    return await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['customer', 'subscription'],
    });
  }

  async listCustomerCheckoutSessions(
    customerId: string,
    limit: number = 10,
  ): Promise<Stripe.Checkout.Session[]> {
    const stripe = this.getStripe();

    const sessions = await stripe.checkout.sessions.list({
      customer: customerId,
      limit,
    });

    return sessions.data;
  }

  async getInvoice(invoiceId: string): Promise<Stripe.Invoice> {
    this.ensureStripeIsConfigured();
    const stripe = this.getStripe();

    return await stripe.invoices.retrieve(invoiceId);
  }

  async listCustomerInvoices(
    customerId: string,
    limit: number = 10,
  ): Promise<Stripe.Invoice[]> {
    this.ensureStripeIsConfigured();
    const stripe = this.getStripe();

    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit,
    });

    return invoices.data;
  }

  constructWebhookEvent(
    payload: string | Buffer,
    signature: string,
    webhookSecret?: string,
  ): Stripe.Event {
    const stripe = this.getStripe();

    const secret = webhookSecret || process.env.STRIPE_WEBHOOK_SECRET;

    if (!secret) {
      throw new Error('STRIPE_WEBHOOK_SECRET não configurado');
    }

    try {
      return stripe.webhooks.constructEvent(payload, signature, secret);
    } catch (error) {
      this.logger.error(`Erro ao construir webhook event: ${error.message}`);
      throw error;
    }
  }

  async createTestPaymentMethod(): Promise<Stripe.PaymentMethod> {
    const stripe = this.getStripe();

    // Cartões de teste do Stripe
    const testCard = {
      type: 'card' as const,
      card: {
        number: '4242424242424242',
        exp_month: 12,
        exp_year: new Date().getFullYear() + 1,
        cvc: '123',
      },
    };

    return await stripe.paymentMethods.create(testCard);
  }

  isTestMode(): boolean {
    return this._apiKey ? this._apiKey.includes('_test_') : false;
  }

  getPublishableKey(): string {
    return process.env.STRIPE_PUBLISHABLE_KEY || '';
  }

  getStripeInstance(): Stripe {
    this.ensureStripeIsConfigured();
    return this.getStripe();
  }
}
