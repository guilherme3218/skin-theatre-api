import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CreateUserDto } from '../../dto/create-user.dto';
import { UsersService } from '../../services/users/users.service';
import { AuthService } from 'src/modules/auth/services/auth/auth.service';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
  ) {}

  @Post('login')
  async create(@Body() body: CreateUserDto) {
    if (body?.auth_sso?.token) {
      const { email } = await this.authService.userInfo(body?.auth_sso?.token);
      if (email) return this.usersService.findByEmail(email);
    }
    return this.usersService.create(body);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Get(':email')
  async findByEmail(@Param('email') email: string) {
    return this.usersService.findByEmail(email);
  }
}
