/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/module/prisma/prisma.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SuperAdminCompanyService {
  constructor(private readonly prisma: PrismaService) {}

  async createCompany(createCompanyDto: CreateCompanyDto) {
    await this.checkCompanyUniqueness(createCompanyDto);

    const slug = await this.generateUniqueSlug(createCompanyDto.name);

    return this.prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name: createCompanyDto.name,
          email: createCompanyDto.email,
          phone: createCompanyDto.phone,
          cnpj: createCompanyDto.cnpj,
          description: createCompanyDto.description,
          slug: slug,
          webhookUrl: createCompanyDto.webhookUrl,
          contractDate: new Date(),
        },
      });

      let address: any = null;
      if (createCompanyDto.address) {
        address = await tx.address.create({
          data: {
            ...createCompanyDto.address,
            companyId: company.id,
          },
        });
      }

      const defaultPassword = this.generateTemporaryPassword();
      const hashedPassword = await bcrypt.hash(defaultPassword, 12);

      const companyUser = await tx.companyUser.create({
        data: {
          name: 'Administrador',
          email: createCompanyDto.email,
          cpf: '00000000000',
          phone: createCompanyDto.phone || '00000000000',
          password: hashedPassword,
          companyId: company.id,
        },
      });

      return {
        company,
        address,
        companyUser: {
          id: companyUser.id,
          email: companyUser.email,
          temporaryPassword: defaultPassword,
        },
        message: 'Empresa criada com sucesso',
      };
    });
  }

  private generateTemporaryPassword(): string {
    const length = 10;
    const charset =
      'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';

    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * charset.length);
      password += charset[randomIndex];
    }

    return password;
  }

  async updateCompany(id: string, updateCompanyDto: UpdateCompanyDto) {
    await this.findCompanyById(id);

    if (updateCompanyDto.email || updateCompanyDto.cnpj) {
      await this.checkCompanyUniquenessForUpdate(id, updateCompanyDto);
    }

    return this.prisma.$transaction(async (tx) => {
      const { address, ...companyData } = updateCompanyDto as any;
      const company = await tx.company.update({
        where: { id },
        data: {
          ...companyData,
          // Não atualizar slug automaticamente para evitar quebras de URL
          // slug: updateCompanyDto.name ? await this.generateUniqueSlug(updateCompanyDto.name) : undefined,
        },
      });

      let addressResult: any = null;
      if (address) {
        const existingAddress = await tx.address.findUnique({
          where: { companyId: id },
        });

        if (existingAddress) {
          addressResult = await tx.address.update({
            where: { companyId: id },
            data: address,
          });
        } else {
          addressResult = await tx.address.create({
            data: {
              ...address,
              companyId: id,
            },
          });
        }
      }

      return {
        company,
        address: addressResult,
        message: 'Empresa atualizada com sucesso',
      };
    });
  }

  async deleteCompany(id: string): Promise<{ message: string }> {
    this.validadeId(id);

    const company = await this.findCompanyById(id);

    await this.checkCompanyCriticalDependencies(id);

    return this.prisma.$transaction(async (tx) => {
      await tx.invoice.deleteMany({
        where: { companyId: id },
      });

      await tx.subscription.deleteMany({
        where: { companyId: id },
      });

      await tx.customer.deleteMany({
        where: { companyId: id },
      });

      await tx.plan.deleteMany({
        where: { companyId: id },
      });

      await tx.companyUser.deleteMany({
        where: { companyId: id },
      });

      await tx.webhookEvent.deleteMany({
        where: { companyId: id },
      });

      await tx.address.deleteMany({
        where: { companyId: id },
      });

      await tx.company.delete({
        where: { id },
      });

      return {
        message:
          'Empresa e todos os dados relacionados foram permanentemente deletados',
      };
    });
  }

  async findAllCompanies() {
    return this.prisma.company.findMany({
      include: {
        address: true,
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            isActive: true,
          },
        },
        _count: {
          select: {
            users: true,
            customers: true,
            subscriptions: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findCompanyById(id: string) {
    this.validadeId(id);

    const company = await this.prisma.company.findUnique({
      where: { id },
      include: {
        address: true,
        users: true,
        plans: true,
        customers: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        subscriptions: {
          include: {
            plan: true,
            customer: true,
          },
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }

    return company;
  }

  async toggleCompanyStatus(id: string) {
    this.validadeId(id);

    const company = await this.findCompanyById(id);

    return this.prisma.company.update({
      where: { id },
      data: {
        isActive: !company.isActive,
      },
    });
  }

  private async checkCompanyUniqueness(createCompanyDto: CreateCompanyDto) {
    const existingCompany = await this.prisma.company.findFirst({
      where: {
        OR: [
          { email: createCompanyDto.email },
          ...(createCompanyDto.cnpj ? [{ cnpj: createCompanyDto.cnpj }] : []),
        ],
      },
    });

    if (existingCompany) {
      if (existingCompany.email === createCompanyDto.email) {
        throw new ConflictException('Já existe uma empresa com este email');
      }
      if (existingCompany.cnpj === createCompanyDto.cnpj) {
        throw new ConflictException('Já existe uma empresa com este CNPJ');
      }
    }
  }

  private async checkCompanyUniquenessForUpdate(
    id: string,
    updateCompanyDto: UpdateCompanyDto,
  ) {
    const existingCompany = await this.prisma.company.findFirst({
      where: {
        OR: [
          ...(updateCompanyDto.email
            ? [{ email: updateCompanyDto.email }]
            : []),
          ...(updateCompanyDto.cnpj ? [{ cnpj: updateCompanyDto.cnpj }] : []),
        ],
        NOT: {
          id: id,
        },
      },
    });

    if (existingCompany) {
      if (
        updateCompanyDto.email &&
        existingCompany.email === updateCompanyDto.email
      ) {
        throw new ConflictException('Já existe uma empresa com este email');
      }
      if (
        updateCompanyDto.cnpj &&
        existingCompany.cnpj === updateCompanyDto.cnpj
      ) {
        throw new ConflictException('Já existe uma empresa com este CNPJ');
      }
    }
  }

  private async generateUniqueSlug(name: string): Promise<string> {
    const baseSlug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '')
      .substring(0, 50);

    let slug = baseSlug;
    let counter = 1;

    while (await this.prisma.company.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }

  private validadeId(id: string): void {
    if (typeof id !== 'string' || id.length < 7) {
      throw new BadRequestException('ID inválido');
    }
  }

  private async checkCompanyCriticalDependencies(id: string): Promise<void> {
    const criticalDeps = await this.prisma.company.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            customers: true,
            subscriptions: true,
            invoices: true,
          },
        },
      },
    });

    if (!criticalDeps) {
      throw new NotFoundException('Empresa não encontrada');
    }

    if (criticalDeps._count.subscriptions > 0) {
      throw new ForbiddenException(
        'Não é possível deletar permanentemente uma empresa com assinaturas ativas. Use soft delete primeiro.',
      );
    }
  }
}
