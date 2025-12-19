export type PlanIntervalDto =
  | 'DAILY'
  | 'WEEKLY'
  | 'MONTHLY'
  | 'QUARTERLY'
  | 'BIANNUAL'
  | 'YEARLY';

export class PlanDto {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  interval: PlanIntervalDto;
  active: boolean;
  companyName?: string;
}
