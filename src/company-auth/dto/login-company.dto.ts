import { IsString, MinLength } from 'class-validator';

export class LoginCompanyDto {
  @IsString()
  @MinLength(3)
  emailOrCpf: string;

  @IsString()
  @MinLength(6)
  password: string;
}
