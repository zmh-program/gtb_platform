import {
  ALL_TRANSLATIONS,
  LAST_UPDATED,
  TOTAL_THEMES,
  TOTAL_TRANSLATIONS,
} from "@/lib/source/source";
import { ThemesTableWrapper } from "./table-wrapper";
import { ThemeRow } from "./columns";
import { Github } from "lucide-react";

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

  const data: ThemeRow[] = items.map((item) => ({
    id: item.id,
    theme: item.theme,
    shortcut: item.shortcut ?? null,
    multiwords: item.multiwords ?? [],
    translations: item.translations,
  }));

  return (
    <div className="w-full h-screen bg-[#111] text-[#ccc] overflow-hidden flex flex-col font-mono text-sm selection:bg-blue-900/40">
      <div className="h-10 border-b border-[#333] flex items-center px-4 justify-between bg-[#1c1c1c] shrink-0">
        <div className="flex items-center gap-4 text-[11px] font-medium tracking-wide">
          <a
            href="https://github.com/zmh-program/gtb_platform/blob/main/lib/source/translations-data.json"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-[#888] hover:text-blue-400 transition-colors group"
          >
            <span className="text-white group-hover:text-blue-400">
              {TOTAL_TRANSLATIONS.toLocaleString()}
            </span>{" "}
            translations
            <span className="text-[#444]">/</span>
            <span className="text-white group-hover:text-blue-400">
              {TOTAL_THEMES.toLocaleString()}
            </span>{" "}
            themes
          </a>
          <span className="text-[#444]">|</span>
          <span className="text-[#666]">updated {LAST_UPDATED}</span>
        </div>

        <div className="flex items-center">
          <a
            href="https://github.com/zmh-program/gtb_platform/blob/main/lib/source/translations-data.json"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#666] hover:text-white transition-colors"
          >
            <Github className="w-4 h-4" />
          </a>
        </div>
      </div>
      <div className="flex-1 overflow-hidden p-0 sm:p-2 bg-[#111]">
        <ThemesTableWrapper data={data} languageKeys={languageKeys} />
      </div>
    </div>
  );
}
