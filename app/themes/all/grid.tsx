"use client";

import { useCallback, useMemo, useState } from "react";
import {
  DataEditor,
  GridCell,
  GridCellKind,
  GridColumn,
  Item,
} from "@glideapps/glide-data-grid";
import { languageOptionsWithComplement } from "@/components/ui/language-select";
import { useTheme } from "next-themes";
import Link from "next/link";

type TranslationValue = {
  translation: string;
  is_approved: boolean;
  approved_at: string | null;
};

type ThemeRow = {
  id: number;
  theme: string;
  shortcut: string | null;
  multiwords: string[];
  translations: Record<string, TranslationValue | undefined>;
};

type Meta = {
  lastUpdated: string;
  totalThemes: number;
  totalTranslations: number;
  languages: number;
  themesWithMultiwords: number;
  langStats: Record<string, { total: number; approved: number }>;
};

type ThemesAllGridProps = {
  meta: Meta;
  languageKeys: string[];
  items: ThemeRow[];
};

function getLangLabel(lang: string): string {
  return languageOptionsWithComplement[lang]?.label ?? lang;
}

export default function ThemesAllGrid({
  meta,
  languageKeys,
  items,
}: ThemesAllGridProps) {
  const [rows, setRows] = useState<ThemeRow[]>(items);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const columns: GridColumn[] = useMemo(() => {
    const base: GridColumn[] = [
      { id: "theme", title: "Theme", width: 160 },
      { id: "shortcut", title: "Shortcut", width: 140 },
      { id: "multiwords", title: "Multiwords", width: 100 },
    ];

    const langs: GridColumn[] = languageKeys.map((lang) => ({
      id: `lang:${lang}`,
      title: getLangLabel(lang),
      width: 180,
    }));

    return [...base, ...langs];
  }, [languageKeys]);

  const getCellContent = useCallback(
    ([col, row]: Item): GridCell => {
      const emptyCell: GridCell = {
        kind: GridCellKind.Text,
        data: "",
        displayData: "",
        allowOverlay: true,
      };

      const item = rows[row];
      const column = columns[col];

      if (!item || !column) {
        return emptyCell;
      }

      if (column.id === "theme") {
        return {
          kind: GridCellKind.Text,
          data: item.theme,
          displayData: item.theme,
          allowOverlay: true,
        };
      }

      if (column.id === "shortcut") {
        const v = item.shortcut ?? "";
        return {
          kind: GridCellKind.Text,
          data: v,
          displayData: v,
          allowOverlay: true,
        };
      }

      if (column.id === "multiwords") {
        const v =
          item.multiwords && item.multiwords.length
            ? item.multiwords.length.toString()
            : "";
        return {
          kind: GridCellKind.Text,
          data: v,
          displayData: v,
          allowOverlay: false,
        };
      }

      if (typeof column.id === "string" && column.id.startsWith("lang:")) {
        const lang = column.id.slice("lang:".length);
        const t = item.translations?.[lang];
        const v = t?.translation ?? "";

        const approvedRaw = (t as any)?.is_approved;
        const approved: boolean =
          approvedRaw === true || approvedRaw === 1 || approvedRaw === "true";
        const bg = isDark ? "#6b4f00" : "#fde68a";
        const fg = isDark ? "#f8fafc" : "#0f172a";

        return {
          kind: GridCellKind.Text,
          data: v,
          displayData: v,
          allowOverlay: true,
          themeOverride:
            t && !approved
              ? ({ bgCell: bg, bgCellMedium: bg, textDark: fg } as any)
              : undefined,
        };
      }

      return emptyCell;
    },
    [columns, isDark, rows],
  );

  return (
    <div className="w-full h-screen">
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground my-0.5">
        <span>{meta.totalTranslations} translations</span>
        <span>{meta.totalThemes} themes</span>
        <span>updated {meta.lastUpdated}</span>
        <Link
          href="https://raw.githubusercontent.com/zmh-program/gtb_platform/refs/heads/main/lib/source/translations-data.json"
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2 hover:text-foreground"
        >
          json source file
        </Link>
        <Link
          href="/themes"
          className="underline underline-offset-2 hover:text-foreground"
        >
          back
        </Link>
      </div>

      <div className="h-[calc(100%-24px)] w-full border rounded-xl overflow-hidden bg-background">
        <DataEditor
          columns={columns}
          rows={rows.length}
          getCellContent={getCellContent}
          rowMarkers="both"
          smoothScrollX
          smoothScrollY
        />
      </div>
    </div>
  );
}
