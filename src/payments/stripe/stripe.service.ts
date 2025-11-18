// Serviço responsável por centralizar a integração com o Stripe
import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private stripe: Stripe;

  constructor() {
    // Aqui eu inicializo o client do Stripe usando a secret key de ambiente
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
      apiVersion: '2024-06-20',
    });
  }

  async createCustomerIfNeeded(params: {
    email: string;
    name: string;
  }): Promise<string> {
    // Depois eu posso melhorar isso para buscar customer existente por email
    const customer = await this.stripe.customers.create({
      email: params.email,
      name: params.name,
    });

    return customer.id;
  }

  async createSubscription(params: {
    customerId: string;
    priceId: string;
  }): Promise<{ subscriptionId: string }> {
    const subscription = await this.stripe.subscriptions.create({
      customer: params.customerId,
      items: [{ price: params.priceId }],
      // No futuro eu posso configurar trial, billing cycle, etc.
    });

    return { subscriptionId: subscription.id };
  }
}
