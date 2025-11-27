import { Type } from 'class-transformer';
import {
  IsEmail,
  IsObject,
  IsOptional,
  IsString,
  Length,
  Matches,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class CreateCompanyAddressDto {
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
  complement?: string;
}

export class CreateCompanyDto {
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
  @Matches(/^\d{14}$|^$/, {
    message: 'CNPJ must be 14 digits',
  })
  cnpj?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  webhookUrl?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => CreateCompanyAddressDto)
  address?: CreateCompanyAddressDto;
}
