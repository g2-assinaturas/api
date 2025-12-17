/* eslint-disable @typescript-eslint/no-unused-vars */

import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/module/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { LoginCompanyDto } from './dto/login-company.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { randomBytes } from 'crypto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class CompanyAuthService {
  private readonly logger = new Logger(CompanyAuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateCompanyUser(emailOrCpf: string, password: string) {
    const cleanEmailOrCpf = emailOrCpf.trim();
    console.log('Validating user with emailOrCpf:', cleanEmailOrCpf);

    const companyUser = await this.prisma.companyUser.findFirst({
      where: {
        OR: [{ email: cleanEmailOrCpf }, { cpf: cleanEmailOrCpf }],
      },
      include: {
        company: true,
      },
    });

    console.log('User found:', companyUser);

    if (!companyUser) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    if (!companyUser.company.isActive) {
      throw new ForbiddenException(
        'Empresa desativada. Entre em contato com o suporte.',
      );
    }

    if (!companyUser.isActive) {
      throw new ForbiddenException(
        'Usuário desativado. Entre em contato com o administrador da empresa.',
      );
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      companyUser.password,
    );

    console.log('Password valid:', isPasswordValid);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const { password: _, company: companyData, ...userData } = companyUser;

    return {
      ...userData,
      company: {
        id: companyData.id,
        name: companyData.name,
        slug: companyData.slug,
      },
    };
  }

  async login(loginDto: LoginCompanyDto) {
    const companyUser = await this.validateCompanyUser(
      loginDto.emailOrCpf,
      loginDto.password,
    );

    const payload = {
      email: companyUser.email,
      sub: companyUser.id,
      companyId: companyUser.companyId,
      companySlug: companyUser.company.slug,
      role: 'COMPANY_USER',
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: companyUser.id,
        email: companyUser.email,
        name: companyUser.name,
        company: companyUser.company,
      },
    };
  }

  async validateToken(payload: any) {
    this.logger.log(
      `Método validateToken chamado com payload: ${JSON.stringify(payload)}`,
    );

    const companyUser = await this.prisma.companyUser.findUnique({
      where: { id: payload.sub },
      include: {
        company: true,
      },
    });

    if (!companyUser) {
      this.logger.warn(
        `Usuário não encontrado no banco para ID: ${payload.sub}`,
      );
      throw new UnauthorizedException('Usuário não encontrado');
    }

    if (!companyUser.company.isActive) {
      this.logger.warn(
        `Empresa desativada para usuário: ${companyUser.id}, empresa: ${companyUser.companyId}`,
      );
      throw new ForbiddenException('Empresa desativada');
    }

    if (!companyUser.isActive) {
      this.logger.warn(`Usuário desativado: ${companyUser.id}`);
      throw new ForbiddenException('Usuário desativado');
    }

    this.logger.log(
      `Usuário validado com sucesso: ${companyUser.id}, empresa: ${companyUser.companyId}`,
    );
    return companyUser;
  }

  async createFirstCompanyUser(companyId: string, createUserDto: any) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const existingUser = await this.prisma.companyUser.findFirst({
      where: { companyId },
    });

    if (existingUser) {
      throw new ForbiddenException('Empresa já possui usuário cadastrado');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 12);

    return this.prisma.companyUser.create({
      data: {
        name: createUserDto.name,
        email: createUserDto.email,
        cpf: createUserDto.cpf,
        phone: createUserDto.phone || '00000000000',
        password: hashedPassword,
        companyId: companyId,
      } as any, // Explicitly cast to bypass TypeScript error
    });
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<{
    message: string;
    token?: string; // Em produção, enviar por email, não retornar
  }> {
    const { email } = forgotPasswordDto;

    // Buscar usuário pelo email
    const companyUser = await this.prisma.companyUser.findFirst({
      where: { email },
      include: {
        company: true,
      },
    });

    // Por segurança, não informamos se o email existe ou não
    if (!companyUser) {
      this.logger.log(
        `Tentativa de redefinição para email não cadastrado: ${email}`,
      );
      return {
        message:
          'Se o email estiver cadastrado, você receberá instruções para redefinir sua senha.',
      };
    }

    // Verificar se a empresa está ativa
    if (!companyUser.company.isActive) {
      this.logger.warn(
        `Tentativa de redefinição em empresa inativa: ${companyUser.companyId}`,
      );
      return {
        message:
          'Se o email estiver cadastrado, você receberá instruções para redefinir sua senha.',
      };
    }

    // Verificar se o usuário está ativo
    if (!companyUser.isActive) {
      this.logger.warn(
        `Tentativa de redefinição por usuário inativo: ${companyUser.id}`,
      );
      return {
        message:
          'Se o email estiver cadastrado, você receberá instruções para redefinir sua senha.',
      };
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Token válido por 1 hora

    // Salvar token no banco
    await this.prisma.passwordResetToken.create({
      data: {
        token,
        companyUserId: companyUser.id,
        expiresAt,
      },
    });

    this.logger.log(
      `Token de redefinição gerado para usuário: ${companyUser.id}`,
    );

    // EM PRODUÇÃO: Enviar token por email (exemplo simplificado)
    // await this.sendResetEmail(companyUser.email, token);

    // Para desenvolvimento, retornamos o token (não fazer em produção!)
    return {
      message:
        'Instruções para redefinição de senha enviadas para o email cadastrado.',
      token, // REMOVER EM PRODUÇÃO - só para testes
    };
  }

  // AQUI ESTÁ A MUDANÇA: Método para redefinir senha com token
  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{
    message: string;
    requiresReauth: boolean;
  }> {
    const { token, newPassword, confirmNewPassword } = resetPasswordDto;

    // Validar se as senhas coincidem
    if (newPassword !== confirmNewPassword) {
      throw new BadRequestException('As senhas não coincidem');
    }

    // Buscar token
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { token },
      include: {
        companyUser: {
          include: {
            company: true,
          },
        },
      },
    });

    if (!resetToken) {
      throw new BadRequestException('Token inválido ou expirado');
    }

    if (resetToken.used) {
      throw new BadRequestException('Token já utilizado');
    }

    if (resetToken.expiresAt < new Date()) {
      throw new BadRequestException('Token expirado');
    }

    const companyUser = resetToken.companyUser;

    // Verificar se a empresa está ativa
    if (!companyUser.company.isActive) {
      throw new ForbiddenException('Empresa desativada');
    }

    // Verificar se o usuário está ativo
    if (!companyUser.isActive) {
      throw new ForbiddenException('Usuário desativado');
    }

    // Verificar se nova senha é igual à atual
    const isSamePassword = await bcrypt.compare(
      newPassword,
      companyUser.password,
    );
    if (isSamePassword) {
      throw new BadRequestException(
        'Nova senha deve ser diferente da senha atual',
      );
    }

    // Gerar hash da nova senha
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Atualizar senha e marcar token como usado em uma transação
    await this.prisma.$transaction(async (tx) => {
      await tx.companyUser.update({
        where: { id: companyUser.id },
        data: {
          password: hashedPassword,
          updatedAt: new Date(),
        },
      });

      await tx.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { used: true },
      });
    });

    this.logger.log(
      `Senha redefinida com sucesso para usuário: ${companyUser.id}`,
    );

    return {
      message: 'Senha redefinida com sucesso',
      requiresReauth: true, // Forçar novo login
    };
  }

  // AQUI ESTÁ A MUDANÇA: Método para trocar senha (sem senha atual)
  async changePassword(
    companyUserId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string; requiresReauth: boolean }> {
    this.logger.log(`Iniciando troca de senha para usuário: ${companyUserId}`);

    const companyUser = await this.prisma.companyUser.findUnique({
      where: { id: companyUserId },
      include: {
        company: true,
      },
    });

    if (!companyUser) {
      this.logger.error(`Usuário não encontrado: ${companyUserId}`);
      throw new NotFoundException('Usuário não encontrado');
    }

    if (!companyUser.company.isActive) {
      this.logger.warn(
        `Tentativa de troca de senha em empresa inativa: ${companyUser.companyId}`,
      );
      throw new ForbiddenException('Empresa desativada');
    }

    if (!companyUser.isActive) {
      this.logger.warn(
        `Tentativa de troca de senha por usuário inativo: ${companyUserId}`,
      );
      throw new ForbiddenException('Usuário desativado');
    }

    // Validar se as senhas coincidem
    if (
      changePasswordDto.newPassword !== changePasswordDto.confirmNewPassword
    ) {
      this.logger.warn(
        `Confirmação de senha não coincide para usuário: ${companyUserId}`,
      );
      throw new BadRequestException('As senhas não coincidem');
    }

    // Verificar se nova senha é igual à atual
    const isSamePassword = await bcrypt.compare(
      changePasswordDto.newPassword,
      companyUser.password,
    );

    if (isSamePassword) {
      this.logger.warn(
        `Nova senha igual à atual para usuário: ${companyUserId}`,
      );
      throw new BadRequestException(
        'Nova senha deve ser diferente da senha atual',
      );
    }

    // Gerar hash da nova senha
    const hashedPassword = await bcrypt.hash(changePasswordDto.newPassword, 12);

    // Atualizar senha
    await this.prisma.companyUser.update({
      where: { id: companyUserId },
      data: {
        password: hashedPassword,
        updatedAt: new Date(),
      },
    });

    this.logger.log(
      `Senha alterada com sucesso para usuário: ${companyUserId}`,
    );

    this.logPasswordChange(companyUser);

    return {
      message: 'Senha alterada com sucesso',
      requiresReauth: false,
    };
  }

  private logPasswordChange(companyUser: any): void {
    this.logger.log(
      `Mudança de senha - Usuário: ${companyUser.id}, Empresa: ${companyUser.companyId}`,
    );
  }

  // AQUI ESTÁ A MUDANÇA: Método para limpar tokens expirados (opcional)
  async cleanupExpiredTokens(): Promise<void> {
    try {
      const result = await this.prisma.passwordResetToken.deleteMany({
        where: {
          OR: [{ expiresAt: { lt: new Date() } }, { used: true }],
        },
      });

      if (result.count > 0) {
        this.logger.log(`Limpeza de tokens: ${result.count} tokens removidos`);
      }
    } catch (error) {
      this.logger.error('Erro na limpeza de tokens:', error);
    }
  }
}
