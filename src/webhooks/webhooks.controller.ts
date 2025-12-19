import * as common from '@nestjs/common';
import { Request } from 'express';
import { StripeService } from '../modules/stripe/stripe.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

@common.Controller('webhooks/stripe')
export class StripeWebhookController {
  private readonly logger = new common.Logger(StripeWebhookController.name);

  constructor(
    private readonly stripeService: StripeService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  @common.Post()
  async handleWebhook(
    @common.Headers('stripe-signature') signature: string,
    @common.Req() req: common.RawBodyRequest<Request>,
  ) {
    if (!signature) {
      throw new common.HttpException(
        'Assinatura Stripe não fornecida',
        common.HttpStatus.BAD_REQUEST,
      );
    }

    try {
      // AQUI ESTÁ A MUDANÇA: Usar o body raw para validação da assinatura
      const rawBody = req.rawBody;

      if (!rawBody) {
        throw new common.HttpException(
          'Corpo da requisição vazio',
          common.HttpStatus.BAD_REQUEST,
        );
      }

      const event = this.stripeService.constructWebhookEvent(
        rawBody,
        signature,
      );

      this.logger.log(`Webhook Stripe recebido: ${event.type}`);

      // Processar o evento
      await this.subscriptionsService.handleStripeWebhook(event);

      return { received: true };
    } catch (error) {
      this.logger.error(`Erro ao processar webhook: ${error.message}`);

      if (error.message.includes('Invalid signature')) {
        throw new common.HttpException(
          'Assinatura inválida',
          common.HttpStatus.BAD_REQUEST,
        );
      }

      throw new common.HttpException(
        'Erro ao processar webhook',
        common.HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // AQUI ESTÁ A MUDANÇA: Endpoint para testar webhooks localmente
  @common.Post('test')
  async testWebhook(@common.Body() testEvent: any) {
    this.logger.log(`Teste de webhook recebido: ${testEvent.type}`);

    // Validar formato básico do evento de teste
    if (!testEvent.type || !testEvent.data) {
      throw new common.HttpException(
        'Formato do evento de teste inválido',
        common.HttpStatus.BAD_REQUEST,
      );
    }

    // Processar evento de teste
    await this.subscriptionsService.handleStripeWebhook(testEvent);

    return {
      message: 'Evento de teste processado',
      eventType: testEvent.type,
      timestamp: new Date().toISOString(),
    };
  }
}
