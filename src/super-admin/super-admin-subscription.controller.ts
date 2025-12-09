import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SuperAdminJwtGuard } from './guards/super-admin-jwt.guard';
import { SuperAdminSubscriptionService } from './super-admin-subscription.service';
import { CurrentSuperAdmin } from './decorators/current-super-admin.decorator';
import {
  SubscriptionFilterDto,
  UpdateSubscriptionStatusDto,
} from './dto/subscription-filter.dto';

@Controller('super-admin/subscriptions')
@UseGuards(SuperAdminJwtGuard)
export class SuperAdminSubscriptionController {
  constructor(
    private readonly subscriptionService: SuperAdminSubscriptionService,
  ) {}

  @Get()
  async listSubscriptions(
    @CurrentSuperAdmin() superAdmin: any,
    @Query() filters: SubscriptionFilterDto,
  ) {
    const subscriptions =
      await this.subscriptionService.findAllSubscriptions(filters);

    return {
      success: true,
      data: subscriptions,
      meta: {
        total: subscriptions.length,
        filters,
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Get('stats')
  async getStats(@CurrentSuperAdmin() superAdmin: any) {
    const stats = await this.subscriptionService.getSubscriptionStats();

    return {
      success: true,
      data: stats,
    };
  }

  @Get(':id')
  async getSubscription(
    @CurrentSuperAdmin() superAdmin: any,
    @Param('id') id: string,
  ) {
    const subscription =
      await this.subscriptionService.findSubscriptionById(id);

    return {
      success: true,
      data: subscription,
    };
  }

  @Patch(':id/status')
  async updateStatus(
    @CurrentSuperAdmin() superAdmin: any,
    @Param('id') id: string,
    @Body() data: UpdateSubscriptionStatusDto,
  ) {
    const result = await this.subscriptionService.updateSubscriptionStatus(
      id,
      data,
    );

    return {
      success: true,
      message: result.message,
      data: result.subscription,
    };
  }

  @Delete(':id')
  async deleteSubscription(
    @CurrentSuperAdmin() superAdmin: any,
    @Param('id') id: string,
  ) {
    const result = await this.subscriptionService.deleteSubscription(id);

    return {
      success: true,
      message: result.message,
      data: {
        deletedInvoices: result.deletedInvoices,
      },
    };
  }
}
