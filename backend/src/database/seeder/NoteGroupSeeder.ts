import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';

import noteGroupData from './json/noteGroupData.json';
import { NoteGroupItem } from 'src/entity/NoteGroupItem';

export class NoteGroupSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    const count = await em.count(NoteGroupItem);
    if (count === 0) {
      for (const e of noteGroupData) {
        em.create(NoteGroupItem, e);
      }
    }
  }
}
