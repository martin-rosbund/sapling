import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PersonItem } from 'src/entity/PersonItem';
import { EntityManager } from '@mikro-orm/core';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SaplingService {
  constructor(private readonly em: EntityManager) {}

  async validate(
    loginName: string,
    loginPassword: string | null,
  ): Promise<PersonItem> {
    const person = await this.em.findOne(PersonItem, { loginName: loginName });

    if (
      person &&
      person.loginPassword &&
      loginPassword &&
      (await bcrypt.compare(loginPassword, person.loginPassword))
    ) {
      return person;
    }
    throw new UnauthorizedException();
  }
}
