// Contrato que eu vou usar para acesso a dados de usuário
import { RegisterDto } from '../../auth/dto/register.dto';

export abstract class UsersRepository {
  abstract findByEmailOrCpf(emailOrCpf: string): Promise<any | null>;
  abstract createUserWithCompanyAndAddress(data: RegisterDto): Promise<{
    companyUser: any;
    company: any;
    address: any;
  }>;
}
