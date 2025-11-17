// Interface que eu vou usar como contrato para acesso a dados de usuário
import { RegisterDto } from '../../auth/dto/register.dto';

export interface UsersRepository {
  findByEmailOrCpf(emailOrCpf: string): Promise<any | null>;
  createUserWithCompanyAndAddress(data: RegisterDto): Promise<any>;
}
