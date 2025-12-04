import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import {
  CancelSubscriptionDto,
  CheckoutSubscriptionDto,
} from './dto/subscription.dto';
import { CompanyJwtGuard } from '../company-auth/guards/company-jwt.guard';
import { CurrentCompanyUser } from '../company-auth/decorators/current-company-user.decorator';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @UseGuards(CompanyJwtGuard)
  @Get('plans')
  listPlans() {
    // Endpoint que o frontend vai usar para listar planos de assinatura
    return this.subscriptionsService.listPlans();
  }

  @UseGuards(CompanyJwtGuard)
  @Post('checkout')
  checkout(
    @CurrentCompanyUser() user: any,
    @Body() data: CheckoutSubscriptionDto,
  ) {
    // Cria uma assinatura real para o usuário de empresa logado
    return this.subscriptionsService.checkout(user.id, data);
  }

  @UseGuards(CompanyJwtGuard)
  @Get('current')
  getCurrent(@CurrentCompanyUser() user: any) {
    // Busca a assinatura atual da empresa do usuário logado
    return this.subscriptionsService.getCurrent(user.id);
  }

  @UseGuards(CompanyJwtGuard)
  @Post('cancel')
  cancel(
    @CurrentCompanyUser() user: any,
    @Body() data: CancelSubscriptionDto,
  ) {
    // Cancela (ou marca para cancelar no fim do período) a assinatura da empresa
    return this.subscriptionsService.cancel(user.id, data);
  }

  @UseGuards(CompanyJwtGuard)
  @Get('invoices')
  listInvoices(@CurrentCompanyUser() user: any) {
    // Retorna as faturas ligadas à empresa do usuário logado
    return this.subscriptionsService.listInvoices(user.id);
  }
}
