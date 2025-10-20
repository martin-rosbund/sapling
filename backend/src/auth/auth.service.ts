import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PersonItem } from 'src/entity/PersonItem';
import { EntityManager } from '@mikro-orm/core';

@Injectable()
export class AuthService {
  constructor(private readonly em: EntityManager) {}

  async validate(
    loginName: string,
    loginPassword: string | null,
  ): Promise<PersonItem> {
    const person = await this.em.findOne(PersonItem, { loginName: loginName });
    if (person?.comparePassword(loginPassword)) {
      return person;
    }
    throw new UnauthorizedException();
  }
}
