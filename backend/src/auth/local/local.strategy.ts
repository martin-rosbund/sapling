import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, 'local') {
  constructor(private authService: AuthService) {
    super({
      usernameField: 'loginName',
      passwordField: 'loginPassword',
    });
  }

  async validate(loginName: string, loginPassword: string): Promise<any> {
    return await this.authService.validate(loginName, loginPassword);
  }
}
