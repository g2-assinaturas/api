import {
  IsEmail,
  IsOptional,
  IsString,
  Length,
  MinLength,
} from 'class-validator';

export class RegisterBusinessData {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  phone: string;

  @IsOptional()
  @IsString()
  cpfOrCnpj?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class RegisterAddressData {
  @IsString()
  street: string;

  @IsString()
  number: string;

  @IsString()
  neighborhood: string;

  @IsString()
  city: string;

  @IsString()
  state: string;

  @IsString()
  @Length(8, 8)
  zipCode: string;

  @IsOptional()
  @IsString()
  ibgeCode?: string;

  @IsOptional()
  @IsString()
  complement?: string;
}

export class RegisterUserData {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @Length(11, 11)
  cpf: string;

  @IsString()
  @MinLength(6)
  password: string;
}

export class RegisterDto {
  business: RegisterBusinessData;
  address: RegisterAddressData;
  user: RegisterUserData;
}
