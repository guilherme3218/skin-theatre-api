import { Injectable, UnauthorizedException } from '@nestjs/common';
import { GoogleSsoService } from '../../sso/sso.google.service';
@Injectable()
export class AuthService {
  constructor(private googleSsoService: GoogleSsoService) {}

  ssoLogin(dto: { provider: string; token: string }) {
    if (dto.provider == 'google') {
      return this.googleSsoService.verify(dto.token);
    }
    throw new UnauthorizedException('Provider não suportado');
  }
}
