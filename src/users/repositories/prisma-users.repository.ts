import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/module/prisma/prisma.service';
import { UsersRepository } from './users.repository';
import { RegisterDto } from '../../auth/dto/register.dto';

@Injectable()
export class PrismaUsersRepository implements UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmailOrCpf(emailOrCpf: string): Promise<any | null> {
    // Aqui eu vou buscar o usuário pelo email ou cpf
    return this.prisma.companyUser.findFirst({
      where: {
        OR: [{ email: emailOrCpf }, { cpf: emailOrCpf }],
      },
    });
  }

  async createUserWithCompanyAndAddress(data: RegisterDto): Promise<any> {
    const slug = this.generateSlug(data.business.name);

    const result = await this.prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name: data.business.name,
          email: data.business.email,
          phone: data.business.phone,
          cnpj: data.business.cpfOrCnpj,
          description: data.business.description,
          slug: slug,
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
          name: data.user.name,
          email: data.user.email,
          cpf: data.user.cpf,
          password: data.user.password,
          companyId: company.id,
        },
      });

      return { companyUser, company, address };
    });

    return result;
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '')
      .substring(0, 50) + 
      '-' + 
      Date.now().toString().slice(-6);
  }
}