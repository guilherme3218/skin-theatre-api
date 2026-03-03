import { Body, Controller, Post } from '@nestjs/common';
import { SsoLoginDto } from '../../dto/sso-login.dto';
import { RefreshTokenDto } from '../../dto/refresh-token.dto';
import { AuthService } from '../../services/auth/auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('sso')
  async ssoLogin(@Body() dto: SsoLoginDto) {
    return this.authService.ssoLogin(dto);
  }

  @Post('refresh')
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  async logout(@Body() dto: RefreshTokenDto) {
    return this.authService.logout(dto.refreshToken);
  }
}
