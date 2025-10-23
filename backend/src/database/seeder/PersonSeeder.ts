// Seeder for populating the database with initial person data.
import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { PersonItem } from 'src/entity/PersonItem';
import { DatabaseSeeder } from './DatabaseSeeder';

export class PersonSeeder extends Seeder {
  /**
   * Runs the person seeder. If there are no persons, it creates them from the JSON data.
   * Each person is linked to a company, language, and role if found.
   */
  async run(em: EntityManager): Promise<void> {
    const count = await em.count(PersonItem);
    if (count === 0) {
      const data = DatabaseSeeder.loadJsonData<PersonItem>('personData');
      for (const p of data) {
        em.create(PersonItem, p);
      }
    }
  }
}
