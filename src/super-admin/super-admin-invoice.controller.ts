import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SuperAdminJwtGuard } from './guards/super-admin-jwt.guard';
import { SuperAdminInvoiceService } from './super-admin-invoice.service';
import { CurrentSuperAdmin } from './decorators/current-super-admin.decorator';
import { InvoiceStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

class UpdateInvoiceStatusDto {
  @IsEnum(InvoiceStatus)
  status: InvoiceStatus;
}

@Controller('super-admin/invoices')
@UseGuards(SuperAdminJwtGuard)
export class SuperAdminInvoiceController {
  constructor(private readonly invoiceService: SuperAdminInvoiceService) {}

  @Get()
  async listInvoices(
    @CurrentSuperAdmin() superAdmin: any,
    @Query('status') status?: InvoiceStatus,
    @Query('companyId') companyId?: string,
  ) {
    const invoices = await this.invoiceService.findAllInvoices({
      status,
      companyId,
    });

    return {
      success: true,
      data: invoices,
      meta: {
        total: invoices.length,
        filters: { status, companyId },
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Get('stats')
  async getStats(@CurrentSuperAdmin() superAdmin: any) {
    const stats = await this.invoiceService.getInvoiceStats();

    return {
      success: true,
      data: stats,
    };
  }

  @Get(':id')
  async getInvoice(
    @CurrentSuperAdmin() superAdmin: any,
    @Param('id') id: string,
  ) {
    const invoice = await this.invoiceService.findInvoiceById(id);

    return {
      success: true,
      data: invoice,
    };
  }

  @Patch(':id/status')
  async updateStatus(
    @CurrentSuperAdmin() superAdmin: any,
    @Param('id') id: string,
    @Body() data: UpdateInvoiceStatusDto,
  ) {
    const result = await this.invoiceService.updateInvoiceStatus(
      id,
      data.status,
    );

    return {
      success: true,
      message: result.message,
      data: result.invoice,
    };
  }
}
