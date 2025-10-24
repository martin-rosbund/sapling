// Seeder for populating the database with initial Event data.
import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { DatabaseSeeder } from './DatabaseSeeder';
import { ProductItem } from 'src/entity/ProductItem';

export class ProductSeeder extends Seeder {
  /**
   * Runs the Product seeder. If there are no Products, it creates them from the JSON data.
   * Each Product is linked to a company, language, and role if found.
   */
  async run(em: EntityManager): Promise<void> {
    const count = await em.count(ProductItem);
    if (count === 0) {
      const data = DatabaseSeeder.loadJsonData<ProductItem>('productData');
      for (const p of data) {
        em.create(ProductItem, p);
      }
    }
  }
}
