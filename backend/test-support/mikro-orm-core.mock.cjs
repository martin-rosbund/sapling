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

class Type {
  convertToDatabaseValue(value) {
    return value;
  }

  convertToJSValue(value) {
    return value;
  }

  compareAsType() {
    return 'string';
  }

  ensureComparable() {
    return true;
  }
}

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
  Type,
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