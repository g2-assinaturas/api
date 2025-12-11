import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from 'src/module/prisma/prisma.service';
import { SubscriptionStatus } from '@prisma/client';

//Guard para validar se a empresa do usuário tem assinatura ativa
@Injectable()
export class SubscriptionGuard implements CanActivate {
  private readonly logger = new Logger(SubscriptionGuard.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const skipCheck = this.reflector.get<boolean>(
      'skipSubscriptionCheck',
      context.getHandler(),
    );

    if (skipCheck) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Se não há usuário autenticado, deixa o AuthGuard lidar com isso
    if (!user || !user.companyId) {
      this.logger.warn('Guard executado sem usuário autenticado');
      return true;
    }

    try {
      // Busca a assinatura ativa da empresa
      const subscription = await this.prisma.subscription.findFirst({
        where: {
          companyId: user.companyId,
          status: {
            in: [
              SubscriptionStatus.ACTIVE,
              SubscriptionStatus.TRIALING,
            ],
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          plan: {
            select: {
              name: true,
            },
          },
        },
      });

      if (!subscription) {
        this.logger.warn(
          `Empresa ${user.companyId} tentou acessar sem assinatura ativa`,
        );

        throw new ForbiddenException({
          statusCode: 403,
          message: 'Assinatura necessária',
          error: 'SUBSCRIPTION_REQUIRED',
          details:
            'Sua empresa não possui uma assinatura ativa. Entre em contato com o administrador ou renove sua assinatura.',
        });
      }

      // Verifica se a assinatura não expirou
      if (subscription.currentPeriodEnd) {
        const now = new Date();
        const periodEnd = new Date(subscription.currentPeriodEnd);

        if (periodEnd < now && !subscription.cancelAtPeriodEnd) {
          this.logger.warn(
            `Empresa ${user.companyId} com assinatura expirada (${periodEnd})`,
          );

          throw new ForbiddenException({
            statusCode: 403,
            message: 'Assinatura expirada',
            error: 'SUBSCRIPTION_EXPIRED',
            details: `Sua assinatura expirou em ${periodEnd.toLocaleDateString()}. Renove para continuar usando o sistema.`,
          });
        }
      }

      // Adiciona informações da assinatura ao request para uso posterior
      request.subscription = {
        id: subscription.id,
        status: subscription.status,
        planName: subscription.plan.name,
        currentPeriodEnd: subscription.currentPeriodEnd,
      };

      this.logger.log(
        `Acesso autorizado para empresa ${user.companyId} - Plano: ${subscription.plan.name}`,
      );

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }

      // Para outros erros, loga e bloqueia acesso por segurança
      this.logger.error(
        `Erro ao validar assinatura para empresa ${user.companyId}:`,
        error.message,
      );

      throw new ForbiddenException({
        statusCode: 403,
        message: 'Erro ao validar assinatura',
        error: 'SUBSCRIPTION_VALIDATION_ERROR',
        details:
          'Não foi possível validar sua assinatura. Tente novamente em alguns instantes.',
      });
    }
  }
}
