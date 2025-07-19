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
  const wordFormattedAddSuf = wordFormatted + "s";

  const worksFormatted = [
    formatTheme(theme.theme),
    ...Object.values(theme.translations).map((translation) =>
      formatTheme(translation.translation),
    ),
  ];

  return (
    worksFormatted.includes(wordFormatted) ||
    worksFormatted.includes(wordFormattedSuf) ||
    worksFormatted.includes(wordFormattedAddSuf)
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

// Search condition interface
export interface SearchCondition {
  language: string;
  pattern: string;
}

// Filter digits: replace numbers (0-100) with corresponding number of underscores
function filterDigit(pattern: string): string {
  // Replace all hyphens with spaces
  pattern = pattern.replace(/-/g, " ");

  // Replace numbers with underscores
  return pattern.replace(/\d{1,2}/g, (match) => {
    const num = parseInt(match);
    return "_".repeat(num);
  });
}

// Check if a word matches a pattern with wildcards
function matchesPattern(
  word: string,
  pattern: string,
  allowSpaceWildcard: boolean = false,
): boolean {
  if (word.length !== pattern.length) {
    return false;
  }

  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i] !== "_" && pattern[i] !== word[i]) {
      return false;
    }

    if (pattern[i] === "_" && word[i] === " " && !allowSpaceWildcard) {
      return false;
    }
  }

  return true;
}

// Pattern-based search function
export function patternSearchTranslations(
  conditions: SearchCondition[],
): TranslationItem[] {
  if (!conditions.length || conditions.every((c) => !c.pattern.trim())) {
    return [];
  }

  return ALL_TRANSLATIONS.filter((item) => {
    // All conditions must match
    return conditions.every((condition) => {
      if (!condition.pattern.trim()) return true;

      let pattern = condition.pattern.toLowerCase().trim();
      let allowSpaceWildcard = false;

      // Check for space wildcard suffix
      if (pattern.endsWith("!")) {
        allowSpaceWildcard = true;
        pattern = pattern.slice(0, -1).trim();
      }

      // Apply digit filtering
      pattern = filterDigit(pattern);

      // If language is "default" or not found, check theme
      if (condition.language === "default" || !condition.language) {
        const themeText = removeAccents(item.theme).toLowerCase();
        return matchesPattern(themeText, pattern, allowSpaceWildcard);
      }

      // Check specific language translation
      const translation =
        item.translations[condition.language as keyof typeof item.translations];
      if (translation) {
        const translationText = removeAccents(
          translation.translation,
        ).toLowerCase();
        return matchesPattern(translationText, pattern, allowSpaceWildcard);
      }

      return false;
    });
  });
}
