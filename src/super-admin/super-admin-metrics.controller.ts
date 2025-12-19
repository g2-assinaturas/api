import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SuperAdminJwtGuard } from './guards/super-admin-jwt.guard';
import { SuperAdminMetricsService } from './super-admin-metrics.service';
import { CurrentSuperAdmin } from './decorators/current-super-admin.decorator';

@Controller('super-admin/metrics')
@UseGuards(SuperAdminJwtGuard)
export class SuperAdminMetricsController {
  constructor(private readonly metricsService: SuperAdminMetricsService) {}

  @Get('dashboard')
  async getDashboard(@CurrentSuperAdmin() superAdmin: any) {
    const metrics = await this.metricsService.getDashboardMetrics();

    return {
      success: true,
      data: metrics,
    };
  }

  @Get('revenue')
  async getRevenueReport(
    @CurrentSuperAdmin() superAdmin: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    const report = await this.metricsService.getRevenueReport(start, end);

    return {
      success: true,
      data: report,
    };
  }

  @Get('churn')
  async getChurnRate(
    @CurrentSuperAdmin() superAdmin: any,
    @Query('periodMonths') periodMonths?: string,
  ) {
    const months = periodMonths ? parseInt(periodMonths, 10) : 1;

    const churn = await this.metricsService.getChurnRate(months);

    return {
      success: true,
      data: churn,
    };
  }
}
