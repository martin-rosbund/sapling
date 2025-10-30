import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { PersonItem } from 'src/entity/PersonItem';
import { TicketItem } from 'src/entity/TicketItem';
import { EventItem } from 'src/entity/EventItem';

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

  async getOpenTickets(user: PersonItem): Promise<TicketItem[]> {
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const items = await this.em.find(TicketItem, {
      assignee: { handle: user.handle },
      status: { handle: { $nin: ['closed'] } },
      deadlineDate: { $lte: todayEnd },
    });
    return items || [];
  }

  async getOpenEvents(user: PersonItem): Promise<EventItem[]> {
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const items = await this.em.find(EventItem, {
      participants: { handle: user.handle },
      status: { handle: { $nin: ['canceled', 'completed'] } },
      startDate: { $lte: todayEnd },
    });
    return items || [];
  }

  async countOpenTasks(user: PersonItem): Promise<number> {
    let count = 0;
    count += (await this.getOpenEvents(user)).length;
    count += (await this.getOpenTickets(user)).length;

    return count;
  }
}
