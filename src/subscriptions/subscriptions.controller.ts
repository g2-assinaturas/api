import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import {
  CancelSubscriptionDto,
  CheckoutSubscriptionDto,
} from './dto/subscription.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @UseGuards(JwtAuthGuard)
  @Get('plans')
  listPlans() {
    // Endpoint que o frontend vai usar para listar planos de assinatura
    return this.subscriptionsService.listPlans();
  }

  @UseGuards(JwtAuthGuard)
  @Post('checkout')
  checkout(
    @CurrentUser() user: any,
    @Body() data: CheckoutSubscriptionDto,
  ) {
    // Aqui eu crio uma assinatura em memória para o usuário logado
    return this.subscriptionsService.checkout(user.userId, data);
  }

  @UseGuards(JwtAuthGuard)
  @Get('current')
  getCurrent(@CurrentUser() user: any) {
    // Aqui eu busco a assinatura atual do usuário logado
    return this.subscriptionsService.getCurrent(user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('cancel')
  cancel(
    @CurrentUser() user: any,
    @Body() data: CancelSubscriptionDto,
  ) {
    // Aqui eu cancelo (ou marco para cancelar no fim do período) a assinatura do usuário
    return this.subscriptionsService.cancel(user.userId, data);
  }

  @UseGuards(JwtAuthGuard)
  @Get('invoices')
  listInvoices(@CurrentUser() user: any) {
    // Aqui eu retorno as faturas ligadas à assinatura (modo demo)
    return this.subscriptionsService.listInvoices(user.userId);
  }
}
