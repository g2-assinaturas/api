import { IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateCheckoutDto {
  @IsNotEmpty({ message: 'ID do plano é obrigatório' })
  @IsString()
  planId: string;

  @IsOptional()
  @IsUrl({}, { message: 'URL de sucesso deve ser uma URL válida' })
  successUrl?: string;

  @IsOptional()
  @IsUrl({}, { message: 'URL de cancelamento deve ser uma URL válida' })
  cancelUrl?: string;
}
