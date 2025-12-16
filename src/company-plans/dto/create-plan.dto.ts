import { PlanInterval } from '@prisma/client';
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

export class CreatePlanDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive({ message: 'O preço deve ser maior que 0' })
  price: number;

  @IsEnum(PlanInterval)
  interval: PlanInterval;

  @IsOptional()
  @IsArray()
  features?: string[];

  @IsOptional()
  stripePriceId?: string;

  @IsOptional()
  stripeProductId?: string;
}
