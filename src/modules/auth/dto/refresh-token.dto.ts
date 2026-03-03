import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export type AuthPayload = {
  sub: string;
  email: string;
  name: string;
  picture: string | null;
};

export type RefreshPayload = AuthPayload & {
  jti: string;
};
