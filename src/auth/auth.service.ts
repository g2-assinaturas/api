import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { InMemoryUsersRepository } from '../users/repositories/in-memory-users.repository';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersRepository: InMemoryUsersRepository,
  ) {}

  async register(data: RegisterDto) {
    // Aqui eu vou usar o repositório para simular a criação de usuário, empresa e endereço
    const result = await this.usersRepository.createUserWithCompanyAndAddress(
      data,
    );

    return {
      message: 'Registro criado em memória (depois eu troco para Prisma/banco real)',
      result,
    };
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
