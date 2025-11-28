import 'reflect-metadata';

export type SaplingOption =
  | 'isCompany'
  | 'isPerson'
  | 'isSecurity'
  | 'isShowInCompact'
  | 'isColor'
  | 'isIcon'
  | 'isChip'
  | 'isReadOnly'
  | 'isLink'
  | 'isMail'
  | 'isPhone'
  | 'isNavigation';

export function Sapling(options: SaplingOption[]) {
  return function (target: object, propertyKey: string | symbol) {
    Reflect.defineMetadata('sapling:options', options, target, propertyKey);
  };
}

export function hasSaplingOption(
  target: object,
  propertyKey: string,
  option: SaplingOption,
): boolean {
  const options = getSaplingOptions(target, propertyKey);
  return options.includes(option);
}

export function getSaplingOptions(
  target: object,
  propertyKey: string,
): SaplingOption[] {
  return (Reflect.getMetadata('sapling:options', target, propertyKey) ||
    []) as SaplingOption[];
}
