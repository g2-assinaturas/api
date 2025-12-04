/* eslint-disable @typescript-eslint/no-unused-vars */

import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { CompanyAuthService } from './company-auth.service';
import { CompanyJwtGuard } from './guards/company-jwt.guard';
import { LoginCompanyDto } from './dto/login-company.dto';
import { CurrentCompanyUser } from './decorators/current-company-user.decorator';

@Controller('company-auth')
export class CompanyAuthController {
  constructor(private readonly companyAuthService: CompanyAuthService) {}

  @Post('login')
  async login(@Body() loginDto: LoginCompanyDto) {
    return this.companyAuthService.login(loginDto);
  }

  @UseGuards(CompanyJwtGuard)
  @Get('profile')
  getProfile(@CurrentCompanyUser() companyUser: any) {
    const { password, ...profile } = companyUser;
    return {
      message: 'Perfil do usuário da empresa',
      profile,
    };
  }

  @Post('first-user/:companyId')
  async createFirstUser(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Body() createUserDto: any,
  ) {
    const user = await this.companyAuthService.createFirstCompanyUser(
      companyId,
      createUserDto,
    );

    const { password, ...userData } = user;

    return {
      success: true,
      message: 'Usuário inicial criado com sucesso',
      data: userData,
    };
  }
}
