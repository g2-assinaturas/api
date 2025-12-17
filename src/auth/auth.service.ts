import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UsersRepository } from '../users/repositories/users.repository';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersRepository: UsersRepository,
  ) {}

  async register(data: RegisterDto) {
    try {
      console.log('AuthService.register called');
      const result = await this.usersRepository.createUserWithCompanyAndAddress(
        data,
      );

      console.log('Registration successful, returning response');
      return {
        message: 'Empresa registrada com sucesso!',
        companyUser: {
          id: result.companyUser.id,
          name: result.companyUser.name,
          email: result.companyUser.email,
        },
        company: {
          id: result.company.id,
          name: result.company.name,
          slug: result.company.slug,
        },
      };
    } catch (error) {
      console.error('Error in AuthService.register:', error);
      throw error;
    }
  }

  async login(data: LoginDto) {
    // Aqui eu vou tentar achar o usuário em memória (depois eu troco para Prisma)
    const user = await this.usersRepository.findByEmailOrCpf(data.emailOrCpf);

    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado (modo demo)');
    }

    // Como ainda não estou salvando senha, vou deixar a senha fixa em "password" só para fluxo de teste
    if (data.password !== 'password') {
      throw new UnauthorizedException('Senha inválida (modo demo)');
    }

    const payload = { sub: user.id, email: user.email };

    return {
      accessToken: this.jwtService.sign(payload),
    };
  }
}
