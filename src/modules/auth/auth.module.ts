import { Module } from '@nestjs/common';
import { AuthController } from './controllers/auth/auth.controller';
import { AuthService } from './services/auth/auth.service';
import { GoogleSsoService } from './sso/sso.google.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService, GoogleSsoService],
})
export class AuthModule {}
