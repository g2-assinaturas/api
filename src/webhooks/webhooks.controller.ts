import {
  Controller,
  Post,
  Req,
  Headers,
  BadRequestException,
  Logger,
  HttpCode,
} from '@nestjs/common';
import type { Request } from 'express';
import { WebhooksService } from './webhooks.service';
import { StripeService } from '../modules/stripe/stripe.service';

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly webhooksService: WebhooksService,
    private readonly stripeService: StripeService,
  ) {}

  //Endpoint para receber webhooks do Stripe
  //LEMBRAR: Este endpoint deve estar configurado no dashboard do Stripe
        
  @Post('stripe')
  @HttpCode(200) 
  async handleStripeWebhook(
    @Req() request: Request,
    @Headers('stripe-signature') signature: string,
  ): Promise<{ received: boolean }> {
    // Verifica se o Stripe está configurado
    if (!this.stripeService.isConfigured()) {
      this.logger.error(
        'Webhook recebido mas Stripe não está configurado (STRIPE_SECRET_KEY ausente)',
      );
      throw new BadRequestException('Stripe não configurado');
    }

    // Verifica se a assinatura foi enviada
    if (!signature) {
      this.logger.error('Webhook recebido sem assinatura do Stripe');
      throw new BadRequestException('Assinatura do webhook ausente');
    }

    // Pega o body raw (necessário para validar a assinatura)
    const payload = request['rawBody'] || (request.body as Buffer);

    if (!payload) {
      this.logger.error('Webhook recebido sem payload');
      throw new BadRequestException('Payload ausente');
    }

    try {
      //Valida a assinatura do webhook
      const event = this.stripeService.constructWebhookEvent(payload, signature);

      this.logger.log(
        `Webhook validado: ${event.type} (${event.id}) - Processando...`,
      );

      // Processa o evento de forma assíncrona
      await this.webhooksService.processStripeEvent(event);

      return { received: true };
    } catch (error) {
      this.logger.error(
        `Erro ao processar webhook do Stripe: ${error.message}`,
        error.stack,
      );

      if (error.message?.includes('signature')) {
        throw new BadRequestException('Assinatura inválida do webhook');
      }

      throw error;
    }
  }
}
