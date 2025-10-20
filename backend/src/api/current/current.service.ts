import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { PersonItem } from 'src/entity/PersonItem';

@Injectable()
export class CurrentService {
  constructor(private readonly em: EntityManager) {}

  async changePassword(user: PersonItem, newPassword: string): Promise<void> {
    const entity = await this.em.findOne(PersonItem, { handle: user.handle });

    if (entity) {
      this.em.assign(entity, { loginPassword: newPassword }); // Update the entity in the database
      await this.em.flush();
    }
    return;
  }
}
