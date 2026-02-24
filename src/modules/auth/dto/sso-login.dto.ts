import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class SsoLoginDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @IsIn(['google', 'microsoft'], {
    message: 'Provider inválido',
  })
  provider: 'google' | 'microsoft';
}
