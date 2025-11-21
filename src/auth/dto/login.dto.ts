import { IsString, Matches, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @Matches(/^([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|\d{11})$/, {
    message: 'Must be a valid email or CPF (11 digits)',
  })
  emailOrCpf: string;

  @IsString()
  @MinLength(6)
  password: string;
}
