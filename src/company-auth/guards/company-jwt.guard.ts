import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class CompanyJwtGuard extends AuthGuard('company-jwt') {}
