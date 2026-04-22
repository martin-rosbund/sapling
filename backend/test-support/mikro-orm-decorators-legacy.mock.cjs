class ReflectMetadataProvider {}

const decoratorFactory = () => () => undefined;

module.exports = new Proxy(
  { ReflectMetadataProvider },
  {
    get(target, property) {
      if (property in target) {
        return target[property];
      }

      return decoratorFactory;
    },
  },
);