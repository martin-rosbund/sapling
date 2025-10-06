import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { SaplingService } from './sapling.service';

@Injectable()
export class SaplingStrategy extends PassportStrategy(Strategy, 'local') {
  constructor(private saplingService: SaplingService) {
    super({
      usernameField: 'loginName',
      passwordField: 'loginPassword',
    });
  }

  async validate(loginName: string, loginPassword: string): Promise<any> {
    const user = await this.saplingService.validate(loginName, loginPassword);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
