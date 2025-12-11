import { createParamDecorator, ExecutionContext } from '@nestjs/common';

//Decorator para injetar informações da assinatura atual no controller
 
export const CurrentSubscription = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.subscription;
  },
);
