import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from 'src/module/prisma/prisma.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { PlanInterval, Prisma } from '@prisma/client';

@Injectable()
export class CompanyPlansService {
  private readonly logger = new Logger(CompanyPlansService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createPlan(companyId: string, createPlanDto: CreatePlanDto) {
    this.logger.log(`Criando plano para empresa: ${companyId}`);

    try {
      const company = await this.prisma.company.findUnique({
        where: { id: companyId },
      });

      if (!company) {
        this.logger.error(`Empresa não encontrada: ${companyId}`);
        throw new NotFoundException('Empresa não encontrada');
      }

      if (!company.isActive) {
        this.logger.warn(
          `Tentativa de criar plano em empresa inativa: ${companyId}`,
        );
        throw new ForbiddenException('Empresa desativada');
      }

      this.validatePlanInterval(createPlanDto.interval);

      const priceInCents = Math.round(createPlanDto.price * 100);

      const featuresValue = createPlanDto.features
        ? JSON.stringify(createPlanDto.features)
        : Prisma.JsonNull;

      const plan = await this.prisma.plan.create({
        data: {
          name: createPlanDto.name,
          description: createPlanDto.description,
          price: priceInCents,
          interval: createPlanDto.interval,
          features: featuresValue,
          stripePriceId: createPlanDto.stripePriceId,
          stripeProductId: createPlanDto.stripeProductId,
          companyId,
          currency: 'BRL',
          active: true,
        },
      });

      this.logger.log(
        `Plano criado com sucesso: ${plan.id} para empresa: ${companyId}`,
      );

      return {
        ...plan,
        price: plan.price / 100,
        features: this.parseFeatures(plan.features),
      };
    } catch (error) {
      this.logger.error(`Erro ao criar plano: ${error.message}`, error.stack);
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Erro interno ao criar plano');
    }
  }

  async findAllPlans(companyId: string) {
    this.logger.log(`Listando planos para empresa: ${companyId}`);

    try {
      const company = await this.prisma.company.findUnique({
        where: { id: companyId },
      });

      if (!company) {
        throw new NotFoundException('Empresa não encontrada');
      }

      const plans = await this.prisma.plan.findMany({
        where: {
          companyId,
          active: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return plans.map((plan) => ({
        ...plan,
        price: plan.price / 100,
        features: this.parseFeatures(plan.features),
      }));
    } catch (error) {
      this.logger.error(`Erro ao listar planos: ${error.message}`, error.stack);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Erro interno ao listar planos');
    }
  }

  async findPlanById(companyId: string, planId: string) {
    this.logger.log(`Buscando plano: ${planId} da empresa: ${companyId}`);

    try {
      const plan = await this.prisma.plan.findFirst({
        where: {
          id: planId,
          companyId,
        },
      });

      if (!plan) {
        this.logger.error(
          `Plano não encontrado: ${planId} para empresa: ${companyId}`,
        );
        throw new NotFoundException('Plano não encontrado');
      }

      return {
        ...plan,
        price: plan.price / 100,
        features: this.parseFeatures(plan.features),
      };
    } catch (error) {
      this.logger.error(`Erro ao buscar plano: ${error.message}`, error.stack);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Erro interno ao buscar plano');
    }
  }

  async updatePlan(
    companyId: string,
    planId: string,
    updatePlanDto: UpdatePlanDto,
  ) {
    this.logger.log(`Atualizando plano: ${planId} da empresa: ${companyId}`);

    try {
      const existingPlan = await this.findPlanById(companyId, planId);
      this.logger.log(`Plano encontrado para atualização: ${existingPlan.id}`);

      if (updatePlanDto.interval) {
        this.validatePlanInterval(updatePlanDto.interval);
      }

      const updateData: any = {};

      if (updatePlanDto.name !== undefined) {
        updateData.name = updatePlanDto.name;
      }

      if (updatePlanDto.description !== undefined) {
        updateData.description = updatePlanDto.description;
      }

      if (updatePlanDto.price !== undefined) {
        updateData.price = Math.round(updatePlanDto.price * 100);
      }

      if (updatePlanDto.interval !== undefined) {
        updateData.interval = updatePlanDto.interval;
      }

      if (updatePlanDto.features !== undefined) {
        updateData.features = updatePlanDto.features
          ? JSON.stringify(updatePlanDto.features)
          : Prisma.JsonNull;
      }

      if (updatePlanDto.stripePriceId !== undefined) {
        updateData.stripePriceId = updatePlanDto.stripePriceId;
      }

      if (updatePlanDto.stripeProductId !== undefined) {
        updateData.stripeProductId = updatePlanDto.stripeProductId;
      }

      const updatedPlan = await this.prisma.plan.update({
        where: { id: planId },
        data: updateData,
      });

      this.logger.log(`Plano atualizado com sucesso: ${planId}`);

      return {
        ...updatedPlan,
        price: updatedPlan.price / 100,
        features: this.parseFeatures(updatedPlan.features),
      };
    } catch (error) {
      this.logger.error(
        `Erro ao atualizar plano: ${error.message}`,
        error.stack,
      );
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Erro interno ao atualizar plano');
    }
  }

  async togglePlanStatus(companyId: string, planId: string) {
    this.logger.log(
      `Alterando status do plano: ${planId} da empresa: ${companyId}`,
    );

    try {
      const plan = await this.findPlanById(companyId, planId);

      if (plan.active) {
        const activeSubscriptions = await this.prisma.subscription.count({
          where: {
            planId: plan.id,
            status: 'ACTIVE',
          },
        });

        if (activeSubscriptions > 0) {
          throw new BadRequestException(
            'Não é possível desativar um plano com assinaturas ativas',
          );
        }
      }

      const updatedPlan = await this.prisma.plan.update({
        where: { id: planId },
        data: {
          active: !plan.active,
        },
      });

      this.logger.log(
        `Status do plano alterado para ${updatedPlan.active ? 'ativo' : 'inativo'}: ${planId}`,
      );

      return {
        ...updatedPlan,
        price: updatedPlan.price / 100,
        features: this.parseFeatures(updatedPlan.features),
      };
    } catch (error) {
      this.logger.error(
        `Erro ao alterar status do plano: ${error.message}`,
        error.stack,
      );
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Erro interno ao alterar status do plano',
      );
    }
  }

  async deletePlan(companyId: string, planId: string) {
    this.logger.log(`Deletando plano: ${planId} da empresa: ${companyId}`);

    try {
      const plan = await this.findPlanById(companyId, planId);

      const subscriptionCount = await this.prisma.subscription.count({
        where: {
          planId: plan.id,
        },
      });

      if (subscriptionCount > 0) {
        throw new BadRequestException(
          'Não é possível deletar um plano com assinaturas vinculadas',
        );
      }

      const deletedPlan = await this.prisma.plan.update({
        where: { id: planId },
        data: {
          active: false,
        },
      });

      this.logger.log(`Plano marcado como inativo: ${planId}`);

      return {
        ...deletedPlan,
        price: deletedPlan.price / 100,
        features: this.parseFeatures(deletedPlan.features),
        message: 'Plano desativado com sucesso',
      };
    } catch (error) {
      this.logger.error(`Erro ao deletar plano: ${error.message}`, error.stack);
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Erro interno ao deletar plano');
    }
  }

  private validatePlanInterval(interval: PlanInterval): void {
    const validIntervals = Object.values(PlanInterval);

    if (!validIntervals.includes(interval)) {
      throw new BadRequestException(
        `Intervalo inválido. Use: ${validIntervals.join(', ')}`,
      );
    }
  }

  async getPlanStats(companyId: string) {
    try {
      const plans = await this.findAllPlans(companyId);

      const stats = await Promise.all(
        plans.map(async (plan) => {
          const subscriptionCount = await this.prisma.subscription.count({
            where: {
              planId: plan.id,
              status: 'ACTIVE',
            },
          });

          return {
            planId: plan.id,
            planName: plan.name,
            activeSubscriptions: subscriptionCount,
            totalRevenue: subscriptionCount * plan.price,
          };
        }),
      );

      const totalActivePlans = plans.filter((p) => p.active).length;
      const totalActiveSubscriptions = stats.reduce(
        (sum, stat) => sum + stat.activeSubscriptions,
        0,
      );
      const totalRevenue = stats.reduce(
        (sum, stat) => sum + stat.totalRevenue,
        0,
      );

      return {
        plans: stats,
        summary: {
          totalPlans: plans.length,
          totalActivePlans,
          totalActiveSubscriptions,
          estimatedMonthlyRevenue: totalRevenue,
        },
      };
    } catch (error) {
      this.logger.error(
        `Erro ao obter estatísticas: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Erro interno ao obter estatísticas',
      );
    }
  }

  private parseFeatures(features: any): string[] {
    try {
      if (!features || features === Prisma.JsonNull) {
        return [];
      }

      if (typeof features === 'string') {
        return JSON.parse(features);
      }

      return features as string[];
    } catch (error) {
      this.logger.warn(`Erro ao parsear features: ${error.message}`);
      return [];
    }
  }
}
