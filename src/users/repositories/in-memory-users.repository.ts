// Implementação em memória só para eu conseguir desenvolver sem banco real
import { UsersRepository } from './users.repository';
import { RegisterDto } from '../../auth/dto/register.dto';
import { Injectable } from '@nestjs/common';

let companiesStore: any[] = [];
let companyUsersStore: any[] = [];
let addressesStore: any[] = [];

@Injectable()
export class InMemoryUsersRepository extends UsersRepository {
  async findByEmailOrCpf(emailOrCpf: string): Promise<any | null> {
    return (
      companyUsersStore.find(
        (u) => u.email === emailOrCpf || u.cpf === emailOrCpf,
      ) || null
    );
  }

  async createUserWithCompanyAndAddress(data: RegisterDto): Promise<any> {
    const slug = this.generateSlug(data.business.name);

    const company = {
      id: `company_${companiesStore.length + 1}`,
      name: data.business.name,
      email: data.business.email,
      phone: data.business.phone,
      cnpj: data.business.cpfOrCnpj,
      description: data.business.description,
      slug: slug,
      isActive: true,
      contractDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    companiesStore.push(company);

    const address = {
      id: `address_${addressesStore.length + 1}`,
      street: data.address.street,
      number: data.address.number,
      neighborhood: data.address.neighborhood,
      city: data.address.city,
      state: data.address.state,
      zipCode: data.address.zipCode,
      complement: data.address.complement,
      companyId: company.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    addressesStore.push(address);

    const companyUser = {
      id: `company_user_${companyUsersStore.length + 1}`,
      name: data.user.name,
      email: data.user.email,
      cpf: data.user.cpf,
      password: data.user.password,
      companyId: company.id,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    companyUsersStore.push(companyUser);

    return {
      companyUser,
      company,
      address,
    };
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
