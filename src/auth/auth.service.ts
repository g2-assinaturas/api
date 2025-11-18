import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UsersRepository } from '../users/repositories/users.repository';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersRepository: UsersRepository,
  ) {}

  async register(data: RegisterDto) {
    // Aqui eu crio usuário, empresa e endereço de verdade usando Prisma
    const result = await this.usersRepository.createUserWithCompanyAndAddress(
      data,
    );

    return {
      message: 'Registro criado com sucesso no banco de dados',
      result,
    };
  }

  async login(data: LoginDto) {
    // Aqui eu vou tentar achar o usuário no banco pelo email ou cpf
    const user = await this.usersRepository.findByEmailOrCpf(data.emailOrCpf);

    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado');
    }

    // TODO: quando eu tiver hash de senha, eu valido aqui com bcrypt
    const isPasswordValid = await bcrypt.compare(
      data.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Senha inválida');
    }

    const payload = { sub: user.id, email: user.email };

    return {
      accessToken: this.jwtService.sign(payload),
    };
  }
}
