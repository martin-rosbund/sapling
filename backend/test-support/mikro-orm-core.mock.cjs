class Collection extends Array {
  constructor(owner) {
    super();
    this.owner = owner;
  }

  add(...items) {
    this.push(...items);
  }
}

class EntityManager {}

class MikroORM {
  static async init() {
    return new MikroORM();
  }

  async close() {
    return undefined;
  }
}

const coreExports = {
  Collection,
  EntityManager,
  MikroORM,
  Options: class Options {},
  Cascade: new Proxy(
    {},
    {
      get: (_, property) => property,
    },
  ),
  raw: (value) => value,
};

module.exports = new Proxy(coreExports, {
  get(target, property) {
    if (property in target) {
      return target[property];
    }

    return () => undefined;
  },
});