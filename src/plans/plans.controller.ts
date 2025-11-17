import { Controller, Get } from '@nestjs/common';
import { PlansService } from './plans.service';

@Controller('plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Get()
  listPlans() {
    // Endpoint de teste direto em /plans, depois eu também exponho via /subscriptions/plans
    return this.plansService.findAll();
  }
}
