import {
  IsEmail,
  IsOptional,
  IsString,
  Length,
  Matches,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class RegisterBusinessData {
  @IsString()
  @MinLength(2)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @Matches(/^(\+\d{1,3})?\d{10,11}$/, {
    message: 'Phone must be a valid phone number',
  })
  phone: string;

  @IsOptional()
  @IsString()
  @Matches(/^(\d{11}|\d{14})$|^$/, {
    message: 'CPF/CNPJ must be 11 (CPF) or 14 (CNPJ) digits',
  })
  cpfOrCnpj?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class RegisterAddressData {
  @IsString()
  @MinLength(2)
  street: string;

  @IsString()
  number: string;

  @IsString()
  @MinLength(2)
  neighborhood: string;

  @IsString()
  @MinLength(2)
  city: string;

  @IsString()
  @Length(2, 2)
  state: string;

  @IsString()
  @Length(8, 8)
  @Matches(/^\d{8}$/, { message: 'Zip code must be 8 digits' })
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
  @MinLength(2)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @Length(11, 11)
  @Matches(/^\d{11}$/, { message: 'CPF must be exactly 11 digits' })
  cpf: string;

  @IsString()
  @Matches(/^(\+\d{1,3})?\d{10,11}$/, {
    message: 'Phone must be a valid phone number',
  })
  phone: string;

  @IsString()
  @MinLength(6)
  password: string;
}

export class RegisterDto {
  @ValidateNested()
  @Type(() => RegisterBusinessData)
  business: RegisterBusinessData;

  @ValidateNested()
  @Type(() => RegisterAddressData)
  address: RegisterAddressData;

  @ValidateNested()
  @Type(() => RegisterUserData)
  user: RegisterUserData;
}
