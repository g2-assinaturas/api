import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { SuperAdminAuthService } from './super-admin-auth.service';
import { LoginSuperAdminDTO } from './dto/login-super-admin.dto';
import { SuperAdminJwtGuard } from './guards/super-admin-jwt.guard';
import { CurrentSuperAdmin } from './decorators/current-super-admin.decorator';

@Controller('super-admin/auth')
export class SuperAdminAuthController {
  constructor(private readonly superAdminAuthService: SuperAdminAuthService) {}

  @Post('login')
  async login(@Body() loginDto: LoginSuperAdminDTO) {
    return this.superAdminAuthService.login(loginDto);
  }

  @UseGuards(SuperAdminJwtGuard)
  @Get('profile')
  getProfile(@CurrentSuperAdmin() superAdmin: any) {
    const { password, ...profile } = superAdmin;
    return {
      message: 'Perfil do Super Admin',
      profile,
    };
  }
}
