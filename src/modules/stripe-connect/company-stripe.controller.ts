import { Controller, Post, Get, Body, UseGuards, Logger } from '@nestjs/common';
import { StripeConnectService } from './stripe-connect.service';
import { CurrentCompanyUser } from 'src/company-auth/decorators/current-company-user.decorator';
import { CompanyJwtGuard } from 'src/company-auth/guards/company-jwt.guard';

@Controller('company/stripe')
@UseGuards(CompanyJwtGuard)
export class CompanyStripeController {
  private readonly logger = new Logger(CompanyStripeController.name);

  constructor(private readonly stripeConnectService: StripeConnectService) {}

  @Get('account/status')
  async getAccountStatus(@CurrentCompanyUser() companyUser: any) {
    this.logger.log(
      `Verificando status Stripe para empresa: ${companyUser.companyId}`,
    );

    const status = await this.stripeConnectService.getAccountStatus(
      companyUser.companyId,
    );

    return {
      success: true,
      data: status,
    };
  }

  @Post('account/setup')
  async setupAccount(
    @CurrentCompanyUser() companyUser: any,
    @Body() body: { returnUrl: string; refreshUrl: string },
  ) {
    this.logger.log(
      `Configurando conta Stripe para empresa: ${companyUser.companyId}`,
    );

    // Criar conta conectada se não existir
    const accountId = await this.stripeConnectService.createConnectedAccount(
      companyUser.companyId,
    );

    // Gerar link de onboarding
    const accountLink = await this.stripeConnectService.createAccountLink(
      companyUser.companyId,
      body.returnUrl,
      body.refreshUrl,
    );

    return {
      success: true,
      message:
        'Conta Stripe configurada. Complete o cadastro no link fornecido.',
      data: {
        accountId,
        onboardingUrl: accountLink.url,
        expiresAt: accountLink.expiresAt,
      },
    };
  }

  @Post('products/create')
  async createProduct(
    @CurrentCompanyUser() companyUser: any,
    @Body()
    body: {
      name: string;
      description?: string;
      amount: number;
      currency: string;
      interval: 'month' | 'year' | 'week' | 'day';
      intervalCount?: number;
    },
  ) {
    this.logger.log(`Criando produto para empresa: ${companyUser.companyId}`);

    const result =
      await this.stripeConnectService.createProductAndPriceForCompany({
        companyId: companyUser.companyId,
        ...body,
      });

    // Salvar o plano no banco de dados da empresa
    // (Precisa criar um serviço para isso)

    return {
      success: true,
      message: 'Produto criado com sucesso',
      data: result,
    };
  }

  @Post('checkout/create')
  async createCheckout(
    @CurrentCompanyUser() companyUser: any,
    @Body()
    body: {
      priceId: string;
      customerEmail?: string;
      customerId?: string;
      successUrl: string;
      cancelUrl: string;
      metadata?: Record<string, string>;
    },
  ) {
    this.logger.log(`Criando checkout para empresa: ${companyUser.companyId}`);

    const checkout =
      await this.stripeConnectService.createCheckoutSessionForCompany({
        companyId: companyUser.companyId,
        ...body,
      });

    return {
      success: true,
      message: 'Sessão de checkout criada',
      data: checkout,
    };
  }
}
