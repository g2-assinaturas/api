import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import 'dotenv/config';

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private stripe: Stripe;

  constructor() {
    const apiKey = process.env.STRIPE_SECRET_KEY;

    if (!apiKey) {
      this.logger.warn(
        'STRIPE_SECRET_KEY não configurada. Integração Stripe desabilitada.',
      );
      // Inicializa com null quando não configurado
      this.stripe = null as any;
      return;
    }

    this.stripe = new Stripe(apiKey, {
      apiVersion: '2025-11-17.clover',
    });
  }

  //Verifica se o Stripe está configurado

  isConfigured(): boolean {
    return !!process.env.STRIPE_SECRET_KEY;
  }

  //Cria um cliente (customer) no Stripe

  async createCustomer(params: {
    email: string;
    name: string;
    metadata?: Record<string, string>;
  }): Promise<Stripe.Customer> {
    this.logger.log(`Criando customer no Stripe: ${params.email}`);

    const customer = await this.stripe.customers.create({
      email: params.email,
      name: params.name,
      metadata: params.metadata || {},
    });

    this.logger.log(`Customer criado no Stripe: ${customer.id}`);
    return customer;
  }

  //Busca um cliente no Stripe por ID

  async getCustomer(customerId: string): Promise<Stripe.Customer> {
    return (await this.stripe.customers.retrieve(
      customerId,
    )) as Stripe.Customer;
  }

  //Atualiza um cliente no Stripe

  async updateCustomer(
    customerId: string,
    params: Stripe.CustomerUpdateParams,
  ): Promise<Stripe.Customer> {
    return await this.stripe.customers.update(customerId, params);
  }

  //Cria um produto no Stripe
 
  async createProduct(params: {
    name: string;
    description?: string;
    metadata?: Record<string, string>;
  }): Promise<Stripe.Product> {
    this.logger.log(`Criando produto no Stripe: ${params.name}`);

    const product = await this.stripe.products.create({
      name: params.name,
      description: params.description,
      metadata: params.metadata || {},
    });

    this.logger.log(`Produto criado no Stripe: ${product.id}`);
    return product;
  }

  /**
   * Cria um preço (price) no Stripe
   */
  async createPrice(params: {
    productId: string;
    unitAmount: number;
    currency: string;
    interval: 'day' | 'week' | 'month' | 'year';
    intervalCount?: number;
    metadata?: Record<string, string>;
  }): Promise<Stripe.Price> {
    this.logger.log(
      `Criando price no Stripe para produto ${params.productId}`,
    );

    const price = await this.stripe.prices.create({
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

  //Cria uma assinatura no Stripe
        
  async createSubscription(params: {
    customerId: string;
    priceId: string;
    metadata?: Record<string, string>;
    trialPeriodDays?: number;
  }): Promise<Stripe.Subscription> {
    this.logger.log(
      `Criando subscription no Stripe para customer ${params.customerId}`,
    );

    const subscription = await this.stripe.subscriptions.create({
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

  //Busca uma assinatura no Stripe

  async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    return await this.stripe.subscriptions.retrieve(subscriptionId);
  }

  //Atualiza uma assinatura no Stripe

  async updateSubscription(
    subscriptionId: string,
    params: Stripe.SubscriptionUpdateParams,
  ): Promise<Stripe.Subscription> {
    return await this.stripe.subscriptions.update(subscriptionId, params);
  }

  /**
   * Cancela uma assinatura no Stripe
   */
  async cancelSubscription(
    subscriptionId: string,
    cancelAtPeriodEnd: boolean = true,
  ): Promise<Stripe.Subscription> {
    this.logger.log(
      `Cancelando subscription no Stripe: ${subscriptionId} (at_period_end: ${cancelAtPeriodEnd})`,
    );

    if (cancelAtPeriodEnd) {
      return await this.stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
    } else {
      return await this.stripe.subscriptions.cancel(subscriptionId);
    }
  }

  //Cria uma sessão de checkout do Stripe
        
  async createCheckoutSession(params: {
    customerId: string;
    priceId: string;
    successUrl: string;
    cancelUrl: string;
    metadata?: Record<string, string>;
  }): Promise<Stripe.Checkout.Session> {
    this.logger.log(
      `Criando checkout session no Stripe para customer ${params.customerId}`,
    );

    const session = await this.stripe.checkout.sessions.create({
      customer: params.customerId,
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
    });

    this.logger.log(`Checkout session criada: ${session.id}`);
    return session;
  }

  //Busca uma fatura no Stripe
        
  async getInvoice(invoiceId: string): Promise<Stripe.Invoice> {
    return await this.stripe.invoices.retrieve(invoiceId);
  }

  //Lista as faturas de um cliente
        
  async listCustomerInvoices(
    customerId: string,
    limit: number = 10,
  ): Promise<Stripe.Invoice[]> {
    const invoices = await this.stripe.invoices.list({
      customer: customerId,
      limit,
    });

    return invoices.data;
  }

  //Constrói evento do webhook a partir da request
  constructWebhookEvent(
    payload: string | Buffer,
    signature: string,
  ): Stripe.Event {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET não configurado');
    }

    return this.stripe.webhooks.constructEvent(
      payload,
      signature,
      webhookSecret,
    );
  }

  //Retorna instância do Stripe (use com cuidado)
  getStripeInstance(): Stripe {
    return this.stripe;
  }
}
