import { Controller, Get } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('plans')
  listPlans() {
    // Endpoint que o frontend vai usar para listar planos de assinatura
    return this.subscriptionsService.listPlans();
  }
}
