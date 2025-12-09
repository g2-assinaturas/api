import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SuperAdminJwtGuard } from './guards/super-admin-jwt.guard';
import { SuperAdminWebhookService } from './super-admin-webhook.service';
import { CurrentSuperAdmin } from './decorators/current-super-admin.decorator';

@Controller('super-admin/webhooks')
@UseGuards(SuperAdminJwtGuard)
export class SuperAdminWebhookController {
  constructor(private readonly webhookService: SuperAdminWebhookService) {}

  @Get()
  async listWebhooks(
    @CurrentSuperAdmin() superAdmin: any,
    @Query('processed') processed?: string,
    @Query('companyId') companyId?: string,
    @Query('type') type?: string,
  ) {
    const processedFilter =
      processed !== undefined ? processed === 'true' : undefined;

    const webhooks = await this.webhookService.findAllWebhooks({
      processed: processedFilter,
      companyId,
      type,
    });

    return {
      success: true,
      data: webhooks,
      meta: {
        total: webhooks.length,
        filters: { processed: processedFilter, companyId, type },
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Get('stats')
  async getStats(@CurrentSuperAdmin() superAdmin: any) {
    const stats = await this.webhookService.getWebhookStats();

    return {
      success: true,
      data: stats,
    };
  }

  @Get('types')
  async getTypes(@CurrentSuperAdmin() superAdmin: any) {
    const types = await this.webhookService.getWebhookTypes();

    return {
      success: true,
      data: types,
    };
  }

  @Get(':id')
  async getWebhook(
    @CurrentSuperAdmin() superAdmin: any,
    @Param('id') id: string,
  ) {
    const webhook = await this.webhookService.findWebhookById(id);

    return {
      success: true,
      data: webhook,
    };
  }

  @Post(':id/retry')
  async retryWebhook(
    @CurrentSuperAdmin() superAdmin: any,
    @Param('id') id: string,
  ) {
    const result = await this.webhookService.retryWebhook(id);

    return {
      success: true,
      message: result.message,
      data: result.webhook,
    };
  }

  @Delete(':id')
  async deleteWebhook(
    @CurrentSuperAdmin() superAdmin: any,
    @Param('id') id: string,
  ) {
    const result = await this.webhookService.deleteWebhook(id);

    return {
      success: true,
      message: result.message,
    };
  }
}
