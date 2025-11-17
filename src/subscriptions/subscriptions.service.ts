import { Injectable } from '@nestjs/common';
import { PlansService } from '../plans/plans.service';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly plansService: PlansService) {}

  listPlans() {
    // Aqui eu uso o serviço de planos para centralizar a regra de listagem
    return this.plansService.findAll();
  }
}
