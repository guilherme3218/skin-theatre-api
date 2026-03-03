import { randomUUID } from 'crypto';
import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { GoogleSsoService } from '../../sso/sso.google.service';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../../../users/services/users/users.service';
import { RedisService } from '../../../redis/services/redis/redis.service';
import { ConfigService } from '@nestjs/config';
import { SsoLoginDto } from '../../dto/sso-login.dto';
import { StringValue } from 'ms';
import { AuthPayload, RefreshPayload } from '../../dto/refresh-token.dto';

@Injectable()
export class AuthService {
  private readonly refreshSecret: string;
  private readonly refreshExpiresIn: StringValue;

  constructor(
    private readonly googleSsoService: GoogleSsoService,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {
    this.refreshSecret =
      this.configService.get<string>('JWT_REFRESH_SECRET') ??
      this.configService.getOrThrow<string>('JWT_SECRET');
    this.refreshExpiresIn = (this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') ??
      '7d') as StringValue;
  }

  async ssoLogin(dto: SsoLoginDto) {
    if (dto.provider !== 'google') {
      throw new UnauthorizedException('Provider não suportado');
    }

    const { name, email, picture } = await this.googleSsoService.verify(dto.token);
    if (!name || !email) {
      throw new UnauthorizedException('Não foi possível realizar o login');
    }

    const user = await this.usersService.createFromSso({
      name,
      email,
      picture,
    });

    const payload: AuthPayload = {
      sub: user.id,
      name: user.name,
      email: user.email,
      picture: user.picture,
    };

    return this.issueTokens(payload);
  }

  async refresh(refreshToken: string) {
    let payload: RefreshPayload;
    try {
      payload = await this.jwtService.verifyAsync<RefreshPayload>(refreshToken, {
        secret: this.refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Refresh token inválido');
    }

    if (!payload.jti) {
      throw new UnauthorizedException('Refresh token inválido');
    }

    const sessionKey = this.getRefreshSessionKey(payload.jti);
    let sessionUserId: string | null;
    try {
      sessionUserId = await this.redisService.get(sessionKey);
    } catch {
      throw new ServiceUnavailableException('Serviço de sessão indisponível');
    }

    if (!sessionUserId || sessionUserId !== payload.sub) {
      throw new UnauthorizedException('Refresh token inválido');
    }

    try {
      await this.redisService.del(sessionKey);
    } catch {
      throw new ServiceUnavailableException('Serviço de sessão indisponível');
    }

    return this.issueTokens({
      sub: payload.sub,
      name: payload.name,
      email: payload.email,
      picture: payload.picture,
    });
  }

  async logout(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync<RefreshPayload>(refreshToken, {
        secret: this.refreshSecret,
        ignoreExpiration: true,
      });

      if (payload.jti) {
        await this.redisService.del(this.getRefreshSessionKey(payload.jti));
      }
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      // No-op: logout idempotente mesmo com token inválido
    }

    return { success: true };
  }

  public async userInfo(token: string) {
    try {
      const response = await this.googleSsoService.verify(token);
      if (!response.email) throw new UnauthorizedException('Erro ao recuperar usuário.');

      return response;
    } catch (error) {
      throw new UnauthorizedException('Erro ao recuperar usuário.');
    }
  }

  protected async issueTokens(payload: AuthPayload) {
    const access_token = await this.jwtService.signAsync(payload);
    const jti = randomUUID();
    const refreshPayload: RefreshPayload = { ...payload, jti };
    const refresh_token = await this.jwtService.signAsync(refreshPayload, {
      secret: this.refreshSecret,
      expiresIn: this.refreshExpiresIn,
    });

    try {
      await this.redisService.set(
        this.getRefreshSessionKey(jti),
        payload.sub,
        this.parseDurationToSeconds(String(this.refreshExpiresIn)),
      );
    } catch {
      throw new ServiceUnavailableException('Serviço de sessão indisponível');
    }

    return {
      access_token,
      refresh_token,
    };
  }

  private getRefreshSessionKey(jti: string): string {
    return `auth:refresh:${jti}`;
  }

  private parseDurationToSeconds(duration: string): number {
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 7 * 24 * 60 * 60;
    }

    const value = Number(match[1]);
    const unit = match[2];
    const multiplierByUnit: Record<string, number> = {
      s: 1,
      m: 60,
      h: 60 * 60,
      d: 24 * 60 * 60,
    };

    return value * multiplierByUnit[unit];
  }
}
