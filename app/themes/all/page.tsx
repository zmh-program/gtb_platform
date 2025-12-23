import {
  ALL_TRANSLATIONS,
  LAST_UPDATED,
  TOTAL_THEMES,
  TOTAL_TRANSLATIONS,
} from "@/lib/source/source";
import ThemesAllGrid from "./grid";

export const metadata = {
  title: "GTB Themes Table",
  description: "All GTB themes overview table",
};

export default function ThemesAllPage() {
  const items = [...ALL_TRANSLATIONS].sort((a, b) =>
    a.theme.localeCompare(b.theme, undefined, { sensitivity: "base" }),
  );

  const languageKeySet = new Set<string>();
  const langStats: Record<string, { total: number; approved: number }> = {};
  let themesWithMultiwords = 0;

  for (const item of items) {
    if (item.multiwords && item.multiwords.length > 0)
      themesWithMultiwords += 1;
    for (const [lang, value] of Object.entries(item.translations ?? {})) {
      if (!value) continue;
      languageKeySet.add(lang);
      const cur = langStats[lang] ?? { total: 0, approved: 0 };
      cur.total += 1;
      if ((value as any).is_approved) cur.approved += 1;
      langStats[lang] = cur;
    }
  }

  const allLanguageKeys = Array.from(languageKeySet);
  const languageKeys = allLanguageKeys
    .filter((k) => k !== "co")
    .sort((a, b) => a.localeCompare(b));

  if (allLanguageKeys.includes("co")) languageKeys.push("co");

  return (
    <div className="w-full h-full">
      <div className="w-full h-full">
        <ThemesAllGrid
          meta={{
            lastUpdated: LAST_UPDATED,
            totalThemes: TOTAL_THEMES,
            totalTranslations: TOTAL_TRANSLATIONS,
            languages: languageKeys.length,
            themesWithMultiwords,
            langStats,
          }}
          languageKeys={languageKeys}
          items={items.map((item) => ({
            id: item.id,
            theme: item.theme,
            shortcut: item.shortcut ?? null,
            multiwords: item.multiwords?.map((m) => m.multiword) ?? [],
            translations: item.translations,
          }))}
        />
      </div>
    </div>
  );
}
