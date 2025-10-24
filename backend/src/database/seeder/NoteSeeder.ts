// Seeder for populating the database with initial note data.
import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { DatabaseSeeder } from './DatabaseSeeder';
import { NoteItem } from 'src/entity/NoteItem';

export class NoteSeeder extends Seeder {
  /**
   * Runs the note  seeder. If there are no note s, it creates them from the JSON data.
   */
  async run(em: EntityManager): Promise<void> {
    const count = await em.count(NoteItem);
    if (count === 0) {
      const data = DatabaseSeeder.loadJsonData<NoteItem>('noteData');
      for (const e of data) {
        em.create(NoteItem, e);
      }
    }
  }
}
