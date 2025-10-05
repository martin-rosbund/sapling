import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { LanguageItem } from 'src/entity/LanguageItem';
import { TranslationItem } from 'src/entity/TranslationItem';

export class TranslationSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    const count = await em.count(TranslationItem, { entity: 'login' });

    if (count === 0) {
        const de = await em.findOne(LanguageItem, { handle: 'de-DE' });
        const en = await em.findOne(LanguageItem, { handle: 'en-US' });

        if (de) {
            em.create(TranslationItem, { entity: 'login', property: 'login', value: 'Anmelden', language: de });
        }  
        
        if (en) {
            em.create(TranslationItem, { entity: 'login', property: 'login', value: 'Login', language: en });
        }
    }
  }
}