export interface LanguageItem {
  handle: string;
  name: string;
}

export interface TranslationItem {
  entity: string;
  property: string;
  language: string;
  value: string;
}