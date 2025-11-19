// Implementação de UsersRepository usando Prisma (quando o banco estiver disponível)
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/module/prisma/prisma.service';
import { UsersRepository } from './users.repository';
import { RegisterDto } from '../../auth/dto/register.dto';
import { Prisma } from 'generated/prisma/client';

@Injectable()
export class PrismaUsersRepository implements UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmailOrCpf(emailOrCpf: string): Promise<any | null> {
    // Aqui eu vou buscar o usuário pelo email ou cpf
    return this.prisma.user.findFirst({
      where: {
        OR: [{ email: emailOrCpf }, { cpf: emailOrCpf }],
      },
    });
  }

  async createUserWithCompanyAndAddress(data: RegisterDto): Promise<any> {
    // Aqui eu crio usuário, empresa, endereço e relação entre eles em uma única transação
    const result = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const user = await tx.user.create({
        data: {
          name: data.user.name,
          email: data.user.email,
          cpf: data.user.cpf,
          // TODO: aqui eu ainda vou fazer hash da senha antes de salvar
          password: data.user.password,
        },
      });

      const company = await tx.company.create({
        data: {
          name: data.business.name,
          email: data.business.email,
          phone: data.business.phone,
          cnpj: data.business.cpfOrCnpj,
          description: data.business.description,
        },
      });

      const address = await tx.address.create({
        data: {
          street: data.address.street,
          number: data.address.number,
          neighborhood: data.address.neighborhood,
          city: data.address.city,
          state: data.address.state,
          zipCode: data.address.zipCode,
          complement: data.address.complement,
          companyId: company.id,
        },
      });

      const companyUser = await tx.companyUser.create({
        data: {
          userId: user.id,
          companyId: company.id,
          role: 'ADMIN',
        },
      });

      return { user, company, address, companyUser };
    });

    return result;
  }
}
