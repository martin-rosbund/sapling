// Seeder for populating the database with initial Favorite data.
import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { DatabaseSeeder } from './DatabaseSeeder';
import { FavoriteItem } from 'src/entity/FavoriteItem';

export class FavoriteSeeder extends Seeder {
  /**
   * Runs the Favorite seeder. If there are no Favorites, it creates them from the JSON data.
   * Each Favorite is linked to its target entity if found.
   */
  async run(em: EntityManager): Promise<void> {
    const count = await em.count(FavoriteItem);
    if (count === 0) {
      const data = DatabaseSeeder.loadJsonData<FavoriteItem>('favoriteData');
      for (const r of data) {
        em.create(FavoriteItem, r);
      }
    }
  }
}
