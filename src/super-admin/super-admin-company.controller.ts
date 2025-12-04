/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { SuperAdminJwtGuard } from './guards/super-admin-jwt.guard';
import { SuperAdminCompanyService } from './super-admin-company.service';
import { CurrentSuperAdmin } from './decorators/current-super-admin.decorator';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

@Controller('super-admin/companies')
@UseGuards(SuperAdminJwtGuard)
export class SuperAdminCompanyController {
  constructor(
    private readonly superAdminCompanyService: SuperAdminCompanyService,
  ) {}

  @Post()
  async createCompany(
    @CurrentSuperAdmin() superAdmin: any,
    @Body() createCompanyDto: CreateCompanyDto,
  ) {
    console.log(
      `Super Admin ${superAdmin.email} criando empresa: ${createCompanyDto.name}`,
    );

    const result =
      await this.superAdminCompanyService.createCompany(createCompanyDto);

    return {
      success: true,
      message: result.message,
      data: {
        company: result.company,
        address: result.address,
        initialUser: {
          email: result.companyUser.email,
          temporaryPassword: result.companyUser.temporaryPassword,
          note: 'Esta senha é temporária e deve ser alterada no primeiro acesso',
        },
      },
    };
  }

  @Put(':id')
  async updateCompany(
    @CurrentSuperAdmin() superAdmin: any,
    @Param('id') id: string,
    @Body() updateCompanyDto: UpdateCompanyDto,
  ) {
    console.log(
      `Super Admin ${superAdmin.name} está atualizando empresa: ${id}`,
    );

    const result = await this.superAdminCompanyService.updateCompany(
      id,
      updateCompanyDto,
    );

    return {
      success: true,
      message: result.message,
      data: result,
    };
  }

  @Get()
  async listCompanies(@CurrentSuperAdmin() superAdmin: any) {
    const companies = await this.superAdminCompanyService.findAllCompanies();

    return {
      success: true,
      data: companies,
      meta: {
        total: companies.length,
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Get(':id')
  async getCompany(
    @CurrentSuperAdmin() superAdmin: any,
    @Param('id') id: string,
  ) {
    const company = await this.superAdminCompanyService.findCompanyById(id);

    return {
      success: true,
      data: company,
    };
  }

  @Patch(':id/toggle-status')
  async toggleCompanyStatus(
    @CurrentSuperAdmin() superAdmin: any,
    @Param('id') id: string,
  ) {
    const company = await this.superAdminCompanyService.toggleCompanyStatus(id);

    return {
      success: true,
      message: `Empresa ${company.isActive ? 'ativada' : 'desativada'} com sucesso`,
      data: {
        id: company.id,
        name: company.name,
        isActive: company.isActive,
      },
    };
  }

  @Delete(':id')
  async deleteCompany(
    @CurrentSuperAdmin() superAdmin: any,
    @Param('id') id: string,
  ) {
    console.log(
      `Super Admin ${superAdmin.name} deletando empresa permanentemente (hard delete): ${id}`,
    );

    const result = await this.superAdminCompanyService.deleteCompany(id);

    return {
      success: true,
      message: result.message,
      data: {
        note: 'Todos os dados da empresa foram removidos.',
      },
    };
  }
}
