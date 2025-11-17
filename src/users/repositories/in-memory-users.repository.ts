// Implementação em memória só para eu conseguir desenvolver sem banco real
import { UsersRepository } from './users.repository';
import { RegisterDto } from '../../auth/dto/register.dto';

let usersStore: any[] = [];

export class InMemoryUsersRepository implements UsersRepository {
  async findByEmailOrCpf(emailOrCpf: string): Promise<any | null> {
    // Aqui eu vou buscar pelo primeiro usuário que tenha email ou cpf igual ao valor informado
    return (
      usersStore.find(
        (u) => u.email === emailOrCpf || u.cpf === emailOrCpf,
      ) || null
    );
  }

  async createUserWithCompanyAndAddress(data: RegisterDto): Promise<any> {
    // Aqui eu simulo a criação de usuário, empresa e endereço em memória
    const user = {
      id: `user_${usersStore.length + 1}`,
      name: data.user.name,
      email: data.user.email,
      cpf: data.user.cpf,
    };

    usersStore.push(user);

    const company = {
      id: `company_${usersStore.length}`,
      name: data.business.name,
      email: data.business.email,
      phone: data.business.phone,
    };

    const address = {
      street: data.address.street,
      number: data.address.number,
      neighborhood: data.address.neighborhood,
      city: data.address.city,
      state: data.address.state,
      zipCode: data.address.zipCode,
    };

    return {
      user,
      company,
      address,
    };
  }
}
