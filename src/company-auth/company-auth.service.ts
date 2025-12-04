/* eslint-disable @typescript-eslint/no-unused-vars */

import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/module/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { LoginCompanyDto } from './dto/login-company.dto';

@Injectable()
export class CompanyAuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateCompanyUser(email: string, password: string): Promise<any> {
    const companyUser = await this.prisma.companyUser.findFirst({
      where: { email },
      include: {
        company: true,
      },
    });

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
      loginDto.email,
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
      access_token: this.jwtService.sign(payload),
      companyUser: {
        id: companyUser.id,
        email: companyUser.email,
        name: companyUser.name,
        company: companyUser.company,
      },
    };
  }

  async validateToken(payload: any) {
    const companyUser = await this.prisma.companyUser.findUnique({
      where: { id: payload.sub },
      include: {
        company: true,
      },
    });

    if (!companyUser) {
      throw new UnauthorizedException('Usuário não encontrado');
    }

    if (!companyUser.company.isActive) {
      throw new ForbiddenException('Empresa desativada');
    }

    if (!companyUser.isActive) {
      throw new ForbiddenException('Usuário desativado');
    }

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
        password: hashedPassword,
        companyId: companyId,
      },
    });
  }
}
