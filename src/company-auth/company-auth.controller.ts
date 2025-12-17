/* eslint-disable @typescript-eslint/no-unused-vars */

import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Param,
  ParseUUIDPipe,
  UseInterceptors,
  ClassSerializerInterceptor,
  Logger,
  Put,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CompanyAuthService } from './company-auth.service';
import { LoginCompanyDto } from './dto/login-company.dto';
import { CurrentCompanyUser } from './decorators/current-company-user.decorator';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CompanyJwtGuard } from './guards/company-jwt.guard';

@ApiTags('Autenticação Empresas')
@Controller('company-auth')
@UseInterceptors(ClassSerializerInterceptor)
export class CompanyAuthController {
  private readonly logger = new Logger(CompanyAuthController.name);

  constructor(private readonly companyAuthService: CompanyAuthService) {}

  @Post('login')
  async login(@Body() loginDto: LoginCompanyDto) {
    return this.companyAuthService.login(loginDto);
  }

  @ApiBearerAuth()
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

  @ApiOperation({ summary: 'Solicitar redefinição de senha' })
  @ApiResponse({
    status: 200,
    description: 'Instruções enviadas para o email cadastrado',
  })
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    this.logger.log(
      `Solicitação de redefinição para: ${forgotPasswordDto.email}`,
    );
    return this.companyAuthService.forgotPassword(forgotPasswordDto);
  }

  @ApiOperation({ summary: 'Redefinir senha com token' })
  @ApiResponse({
    status: 200,
    description: 'Senha redefinida com sucesso',
  })
  @ApiResponse({
    status: 400,
    description: 'Token inválido, expirado ou senhas não coincidem',
  })
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    this.logger.log(`Tentativa de redefinição com token`);
    return this.companyAuthService.resetPassword(resetPasswordDto);
  }

  @ApiOperation({ summary: 'Trocar senha da Empresa' })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Senha alterada com sucesso',
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos ou senhas não coincidem',
  })
  @ApiResponse({
    status: 401,
    description: 'Não autorizado - token JWT ausente ou inválido',
  })
  @ApiResponse({
    status: 403,
    description: 'Empresa ou usuário desativado',
  })
  @UseGuards(CompanyJwtGuard)
  @Put('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentCompanyUser() companyUser: any,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    this.logger.log(
      `Solicitação de troca de senha - Usuário: ${companyUser.id}, Empresa: ${companyUser.companyId}`,
    );
    this.logger.log(
      `Método changePassword ALCANÇADO para usuário: ${companyUser.id}`,
    );

    const result = await this.companyAuthService.changePassword(
      companyUser.id,
      changePasswordDto,
    );

    this.logger.log(
      `Senha alterada com sucesso para usuário: ${companyUser.id}`,
    );

    return {
      success: true,
      message: result.message,
      data: {
        userId: companyUser.id,
        companyId: companyUser.companyId,
        timestamp: new Date().toISOString(),
        requiresReauth: result.requiresReauth,
        note: result.requiresReauth
          ? 'Faça login novamente com a nova senha'
          : 'Senha alterada com sucesso',
      },
    };
  }
}
