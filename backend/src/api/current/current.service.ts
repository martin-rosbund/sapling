import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { PersonItem } from 'src/entity/PersonItem';

// Service for current user operations (e.g., password change)

@Injectable()
export class CurrentService {
  /**
   * Injects the MikroORM EntityManager for database access.
   * @param em - EntityManager instance
   */
  constructor(private readonly em: EntityManager) {}

  /**
   * Changes the password for the given user.
   * @param user - The user whose password is to be changed
   * @param newPassword - The new password
   */
  async changePassword(user: PersonItem, newPassword: string): Promise<void> {
    const entity = await this.em.findOne(PersonItem, { handle: user.handle });

    if (entity) {
      this.em.assign(entity, { loginPassword: newPassword }); // Update the entity in the database
      await this.em.flush();
    }
    return;
  }
}
