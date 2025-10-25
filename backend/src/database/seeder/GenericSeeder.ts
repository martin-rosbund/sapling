// Generic seeder for any entity type
import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { DatabaseSeeder } from './DatabaseSeeder';
import { ENTITY_REGISTRY } from 'src/entity/global/entity.registry';

export class GenericSeeder<T> extends Seeder {
  static entity: any;
  static entityName: string;

  async run(em: EntityManager): Promise<void> {
    const entity = (this.constructor as typeof GenericSeeder).entity;
    const entityName = (this.constructor as typeof GenericSeeder).entityName;
    const count = await em.count(entity);
    if (count === 0) {
      const dataKey = `${entityName}Data`;
      const data = DatabaseSeeder.loadJsonData<T>(dataKey);
      for (const item of data) {
        em.create(entity, item as object);
      }
    }
  }

  static for<E>(entity: new (...args: any[]) => E): typeof GenericSeeder {
    const found = ENTITY_REGISTRY.find(e => e.class === entity);
    if (!found) {
      throw new Error('Entity not found in registry');
    }
    class EntitySeeder extends GenericSeeder<E> {}
    EntitySeeder.entity = entity;
    EntitySeeder.entityName = found.name;
    return EntitySeeder;
  }
}
