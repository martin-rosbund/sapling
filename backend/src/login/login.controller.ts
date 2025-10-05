import { Controller, Post, Body } from '@nestjs/common';
import { LoginService } from './login.service';

@Controller('login')
export class LoginController {
  constructor(private readonly loginService: LoginService) {}

  @Post('login')
  login(@Body() loginData: any) {
    return this.loginService.validateUser(loginData.email, loginData.password);
  }
}
