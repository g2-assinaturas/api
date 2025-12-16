import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  UseGuards,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CompanyPlansService } from './company-plans.service';
import { CompanyJwtGuard } from '../company-auth/guards/company-jwt.guard';
import { CurrentCompanyUser } from '../company-auth/decorators/current-company-user.decorator';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';

@Controller('company/plans')
@UseGuards(CompanyJwtGuard)
export class CompanyPlansController {
  private readonly logger = new Logger(CompanyPlansController.name);

  constructor(private readonly companyPlansService: CompanyPlansService) {}

  @Post()
  async createPlan(
    @CurrentCompanyUser() companyUser: any,
    @Body() createPlanDto: CreatePlanDto,
  ) {
    this.logger.log(
      `Criando plano para empresa ${companyUser.companyId} pelo usuário ${companyUser.id}`,
    );

    const plan = await this.companyPlansService.createPlan(
      companyUser.companyId,
      createPlanDto,
    );

    return {
      success: true,
      message: 'Plano criado com sucesso',
      data: plan,
    };
  }

  @Get()
  async findAllPlans(@CurrentCompanyUser() companyUser: any) {
    this.logger.log(`Listando planos da empresa ${companyUser.companyId}`);

    const plans = await this.companyPlansService.findAllPlans(
      companyUser.companyId,
    );

    return {
      success: true,
      data: plans,
      meta: {
        total: plans.length,
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Get('stats')
  async getPlanStats(@CurrentCompanyUser() companyUser: any) {
    this.logger.log(
      `Buscando estatísticas de planos da empresa ${companyUser.companyId}`,
    );

    const stats = await this.companyPlansService.getPlanStats(
      companyUser.companyId,
    );

    return {
      success: true,
      data: stats,
    };
  }

  @Get(':id')
  async findPlanById(
    @CurrentCompanyUser() companyUser: any,
    @Param('id') planId: string,
  ) {
    this.logger.log(
      `Buscando plano ${planId} da empresa ${companyUser.companyId}`,
    );

    const plan = await this.companyPlansService.findPlanById(
      companyUser.companyId,
      planId,
    );

    return {
      success: true,
      data: plan,
    };
  }

  @Put(':id')
  async updatePlan(
    @CurrentCompanyUser() companyUser: any,
    @Param('id') planId: string,
    @Body() updatePlanDto: UpdatePlanDto,
  ) {
    this.logger.log(
      `Atualizando plano ${planId} da empresa ${companyUser.companyId}`,
    );

    const plan = await this.companyPlansService.updatePlan(
      companyUser.companyId,
      planId,
      updatePlanDto,
    );

    return {
      success: true,
      message: 'Plano atualizado com sucesso',
      data: plan,
    };
  }

  @Put(':id/toggle-status')
  @HttpCode(HttpStatus.OK)
  async togglePlanStatus(
    @CurrentCompanyUser() companyUser: any,
    @Param('id') planId: string,
  ) {
    this.logger.log(
      `Alterando status do plano ${planId} da empresa ${companyUser.companyId}`,
    );

    const plan = await this.companyPlansService.togglePlanStatus(
      companyUser.companyId,
      planId,
    );

    return {
      success: true,
      message: `Plano ${plan.active ? 'ativado' : 'desativado'} com sucesso`,
      data: plan,
    };
  }

  @Delete(':id')
  async deletePlan(
    @CurrentCompanyUser() companyUser: any,
    @Param('id') planId: string,
  ) {
    this.logger.log(
      `Deletando plano ${planId} da empresa ${companyUser.companyId}`,
    );

    const result = await this.companyPlansService.deletePlan(
      companyUser.companyId,
      planId,
    );

    return {
      success: true,
      message: result.message,
      data: result,
    };
  }
}
