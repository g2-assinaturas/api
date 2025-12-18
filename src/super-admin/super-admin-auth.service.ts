import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/module/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { LoginSuperAdminDTO } from './dto/login-super-admin.dto';

@Injectable()
export class SuperAdminAuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validadeSuperAdmin(email: string, password: string): Promise<any> {
    const superAdmin = await this.prisma.superAdmin.findUnique({
      where: { email },
    });

    if (!superAdmin) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const isPasswordValid = await bcrypt.compare(password, superAdmin.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const { password: _, ...result } = superAdmin;
    return result;
  }

  async login(loginDTO: LoginSuperAdminDTO) {
    const superAdmin = await this.validadeSuperAdmin(
      loginDTO.email,
      loginDTO.password,
    );

    const payload = {
      email: superAdmin.email,
      sub: superAdmin.id,
      role: 'SUPER_ADMIN',
    };

    return {
      access_token: this.jwtService.sign(payload),
      superAdmin: {
        id: superAdmin.id,
        email: superAdmin.email,
        name: superAdmin.name,
        role: superAdmin.role,
      },
    };
  }

  async validateToken(payload: any) {
    const superAdmin = await this.prisma.superAdmin.findUnique({
      where: { id: payload.sub },
    });

    if (!superAdmin) {
      throw new UnauthorizedException('Super Admin não encontrado');
    }

    return superAdmin;
  }
}
