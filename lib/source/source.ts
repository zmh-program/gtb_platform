import { type TranslationItem } from "./types";
import translationData from "./translations-data.json";

export const LAST_UPDATED: string = "2025/07/01";
export const ALL_TRANSLATIONS: TranslationItem[] =
  translationData as TranslationItem[];

export const TOTAL_THEMES: number = ALL_TRANSLATIONS.length;
export const TOTAL_TRANSLATIONS: number = ALL_TRANSLATIONS.reduce(
  (count, item) => count + Object.keys(item.translations).length,
  0,
);
