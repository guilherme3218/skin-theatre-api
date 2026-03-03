import { SsoLoginDto } from 'src/modules/auth/dto/sso-login.dto';

export class CreateUserDto {
  name: string;
  email: string;
  picture?: string;
  auth_sso?: SsoLoginDto;
}
