import { Body, Controller, Post } from '@nestjs/common';
import { SsoLoginDto } from '../../dto/sso-login.dto';
import { AuthService } from '../../services/auth/auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('sso')
  async ssoLogin(@Body() dto: { provider: string; token: string }) {
    return this.authService.ssoLogin(dto);
  }
}
