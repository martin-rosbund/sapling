// Seeder for populating the database with initial note group data.
import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';

import noteGroupData from './json/noteGroupData.json';
import { NoteGroupItem } from 'src/entity/NoteGroupItem';

export class NoteGroupSeeder extends Seeder {
  /**
   * Runs the note group seeder. If there are no note groups, it creates them from the JSON data.
   */
  async run(em: EntityManager): Promise<void> {
    const count = await em.count(NoteGroupItem);
    if (count === 0) {
      for (const e of noteGroupData) {
        em.create(NoteGroupItem, e);
      }
    }
  }
}
