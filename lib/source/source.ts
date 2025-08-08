import { type TranslationItem } from "./types";
import translationData from "./translations-data.json";
import versions from "./versions.json";

export const LAST_UPDATED: string = versions.last_updated;
export const ALL_TRANSLATIONS: TranslationItem[] =
  translationData as TranslationItem[];

export const TOTAL_THEMES: number = ALL_TRANSLATIONS.length;
export const TOTAL_TRANSLATIONS: number = ALL_TRANSLATIONS.reduce(
  (count, item) => count + Object.keys(item.translations).length,
  0,
);
