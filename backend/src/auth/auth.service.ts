import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PersonItem } from 'src/entity/PersonItem';
import { EntityManager } from '@mikro-orm/core';

@Injectable()
// Service for authentication logic (user validation)
export class AuthService {
  constructor(private readonly em: EntityManager) {}

  /**
   * Validates a user by login name and password.
   * @param loginName - The user's login name
   * @param loginPassword - The user's password
   * @returns The PersonItem if valid, otherwise throws UnauthorizedException
   */
  async validate(
    loginName: string,
    loginPassword: string | null,
  ): Promise<PersonItem> {
    const person = await this.em.findOne(
      PersonItem,
      { loginName: loginName },
      { populate: ['company'] },
    );
    if (person?.comparePassword(loginPassword)) {
      return person;
    }
    throw new UnauthorizedException();
  }
}
