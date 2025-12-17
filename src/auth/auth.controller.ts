import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() data: RegisterDto) {
    try {
      console.log('Register endpoint called with data:', {
        business: data.business,
        address: data.address,
        user: { ...data.user, password: '[HIDDEN]' }
      });
      return await this.authService.register(data);
    } catch (error) {
      console.error('Error in register controller:', error);
      throw error;
    }
  }

  @Post('login')
  login(@Body() data: LoginDto) {
    return this.authService.login(data);
  }
}
