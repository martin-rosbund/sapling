import 'reflect-metadata';

export function Sapling(options: {
  isCompany?: boolean;
  isPerson?: boolean;
  isSecurity?: boolean;
  isShowInCompact?: boolean;
  isColor?: boolean;
  isIcon?: boolean;
}) {
  return function (target: object, propertyKey: string | symbol) {
    Reflect.defineMetadata(
      'sapling:isCompany',
      options.isCompany,
      target,
      propertyKey,
    );
    Reflect.defineMetadata(
      'sapling:isPerson',
      options.isPerson,
      target,
      propertyKey,
    );
    Reflect.defineMetadata(
      'sapling:isSecurity',
      options.isSecurity,
      target,
      propertyKey,
    );
    Reflect.defineMetadata(
      'sapling:isShowInCompact',
      options.isShowInCompact,
      target,
      propertyKey,
    );
    Reflect.defineMetadata(
      'sapling:isColor',
      options.isColor,
      target,
      propertyKey,
    );
    Reflect.defineMetadata(
      'sapling:isIcon',
      options.isIcon,
      target,
      propertyKey,
    );
  };
}

// Abfrage-Beispiel:
export function getSaplingMetadata(target: object, propertyKey: string) {
  return {
    isCompany: Reflect.getMetadata(
      'sapling:isCompany',
      target,
      propertyKey,
    ) as boolean,
    isPerson: Reflect.getMetadata(
      'sapling:isPerson',
      target,
      propertyKey,
    ) as boolean,
    isSecurity: Reflect.getMetadata(
      'sapling:isSecurity',
      target,
      propertyKey,
    ) as boolean,
    isShowInCompact: Reflect.getMetadata(
      'sapling:isShowInCompact',
      target,
      propertyKey,
    ) as boolean,
    isColor: Reflect.getMetadata(
      'sapling:isColor',
      target,
      propertyKey,
    ) as boolean,
    isIcon: Reflect.getMetadata(
      'sapling:isIcon',
      target,
      propertyKey,
    ) as boolean,
  };
}
