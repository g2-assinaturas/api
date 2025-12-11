import { SetMetadata } from '@nestjs/common';

//Decorator para pular a validação de assinatura em uma rota específica
export const SkipSubscriptionCheck = () =>
  SetMetadata('skipSubscriptionCheck', true);
