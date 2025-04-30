import { ALL_TRANSLATIONS } from "./source/source";
import { type TranslationItem } from "./source/types";
/**
 * Removes accents from a string while preserving Korean and Japanese characters.
 * @param inputStr - The input string to process
 * @returns The processed string with accents removed (if not Korean/Japanese)
 */
export function removeAccents(inputStr: string): string {
  // Check for Korean characters
  const hasKorean = inputStr.split("").some((c) => {
    const code = c.charCodeAt(0);
    return code >= 0xac00 && code <= 0xd7a3; // Korean character range
  });

  // Check for Japanese characters
  const hasJapanese = inputStr.split("").some((c) => {
    const code = c.charCodeAt(0);
    return (
      (code >= 0x3040 && code <= 0x30ff) || // Hiragana and Katakana
      (code >= 0x4e00 && code <= 0x9fff) // Kanji
    );
  });

  // Return original string if it contains Korean or Japanese
  if (hasKorean || hasJapanese) {
    return inputStr;
  }

  // Replace specific characters
  let result = inputStr
    .replace(/ı/g, "i")
    .replace(/ł/g, "l")
    .replace(/Ł/g, "l");

  // Remove diacritical marks
  result = result.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");

  return result;
}

/**
 * Formats a theme string by normalizing it (lowercase, trim, remove spaces)
 * @param theme The theme string to format
 * @returns Normalized theme string
 */
export function formatTheme(theme: string): string {
  return removeAccents(theme).toLowerCase().trim().replace(/\s+/g, "");
}

export function isWorkTheme(word: string, theme?: TranslationItem): boolean {
  if (!theme) return false;

  const wordFormatted = formatTheme(word);
  const wordFormattedSuf = wordFormatted.endsWith("s")
    ? wordFormatted.slice(0, -1)
    : wordFormatted;
  const worksFormatted = [
    formatTheme(theme.theme),
    ...Object.values(theme.translations).map((translation) =>
      formatTheme(translation.translation),
    ),
  ];

  return (
    worksFormatted.includes(wordFormatted) ||
    worksFormatted.includes(wordFormattedSuf)
  );
}
/**
 * Checks if two strings match based on exact match preference
 * @param a First string (already formatted)
 * @param b Second string (already formatted)
 * @param exact Whether to perform exact matching (===) or partial matching (includes)
 * @returns Boolean indicating if strings match
 */
export function isMatch(a: string, b: string, exact: boolean): boolean {
  return exact ? a === b : a.includes(b);
}

export function searchTranslations(
  query: string,
  exact: boolean = false,
): TranslationItem[] {
  if (!query) return [];

  const normalizedQuery = formatTheme(query);

  // Filter matching items
  const matchingItems = ALL_TRANSLATIONS.filter((item) => {
    // Check if theme matches
    if (isMatch(formatTheme(item.theme), normalizedQuery, exact)) {
      return true;
    }

    // If exact matching is required, only check translations if theme didn't match
    return Object.values(item.translations).some((translation) =>
      isMatch(formatTheme(translation.translation), normalizedQuery, exact),
    );
  });

  // Sort results: prioritize exact theme matches first, then partial theme matches, then translation matches
  return matchingItems.sort((a, b) => {
    const aNormalizedTheme = formatTheme(a.theme);
    const bNormalizedTheme = formatTheme(b.theme);

    // Exact theme match gets highest priority
    if (
      aNormalizedTheme === normalizedQuery &&
      bNormalizedTheme !== normalizedQuery
    )
      return -1;
    if (
      bNormalizedTheme === normalizedQuery &&
      aNormalizedTheme !== normalizedQuery
    )
      return 1;

    // Partial theme match gets second priority (only relevant for non-exact searches)
    if (!exact) {
      const aThemeIncludes = aNormalizedTheme.includes(normalizedQuery);
      const bThemeIncludes = bNormalizedTheme.includes(normalizedQuery);

      if (aThemeIncludes && !bThemeIncludes) return -1;
      if (bThemeIncludes && !aThemeIncludes) return 1;
    }

    // Alphabetical sorting for equal priority matches
    return a.theme.localeCompare(b.theme);
  });
}
