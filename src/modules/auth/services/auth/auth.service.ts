import { Injectable, UnauthorizedException } from '@nestjs/common';
import { GoogleSsoService } from '../../sso/sso.google.service';
import { JwtService } from '@nestjs/jwt';
@Injectable()
export class AuthService {
  constructor(
    private googleSsoService: GoogleSsoService,
    private jwtService: JwtService,
  ) {}

  async ssoLogin(dto: { provider: string; token: string }) {
    if (dto.provider == 'google') {
      try {
        const { name, email, picture } = await this.googleSsoService.verify(dto.token);
        if (!name || !email || !picture)
          throw new UnauthorizedException('Não foi possível realizar o login');

        return await this.generateJwt(name, email, picture);
      } catch (error) {}
    }
    throw new UnauthorizedException('Provider não suportado');
  }

  protected async generateJwt(name: string, email: string, picture: string) {
    const payload = {
      name,
      email,
      picture,
    };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
