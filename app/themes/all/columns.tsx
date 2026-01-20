"use client";

import { ColumnDef } from "@tanstack/react-table";
import { type Multiword } from "@/lib/source/types";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, Copy, Info } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { languageOptionsWithComplement } from "@/components/ui/language-select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type TranslationValue = {
    translation: string;
    is_approved: boolean;
    approved_at: string | null;
};

export type ThemeRow = {
    id: number;
    theme: string;
    shortcut: string | null;
    multiwords: Multiword[];
    translations: Record<string, TranslationValue | undefined>;
};

function getLangLabel(lang: string): string {
    return languageOptionsWithComplement[lang]?.label ?? lang;
}

const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
}

export const createColumns = (languageKeys: string[]): ColumnDef<ThemeRow>[] => {
    const baseColumns: ColumnDef<ThemeRow>[] = [
        {
            accessorKey: "theme",
            size: 180,
            enableResizing: true,
            header: ({ column }) => {
                return (
                    <div
                        className="flex items-center gap-2 cursor-pointer hover:text-[#ccc] transition-colors"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Theme
                        {column.getIsSorted() === "asc" ? <span className="opacity-50">↑</span> : column.getIsSorted() === "desc" ? <span className="opacity-50">↓</span> : null}
                    </div>
                );
            },
            cell: ({ row }) => <div className="h-full flex items-center px-3 font-medium text-[#eee] truncate">{row.getValue("theme")}</div>,
        },
        {
            accessorKey: "shortcut",
            size: 120,
            header: ({ column }) => {
                return (
                    <div
                        className="flex items-center gap-2 cursor-pointer hover:text-[#ccc] transition-colors"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Shortcut
                        {column.getIsSorted() === "asc" ? <span className="opacity-50">↑</span> : column.getIsSorted() === "desc" ? <span className="opacity-50">↓</span> : null}
                    </div>
                );
            },
            cell: ({ row }) => {
                const shortcut = row.getValue("shortcut") as string | null;
                return (
                    <div className={cn("h-full flex items-center px-3 font-bold text-[10px] truncate", shortcut ? "text-white" : "text-[#444]")}>
                        {shortcut || "-"}
                    </div>
                )
            },
        },
        {
            accessorKey: "multiwords",
            header: "Multiword",
            size: 300,
            cell: ({ row }) => {
                const multiwords = row.getValue("multiwords") as Multiword[];
                if (!multiwords || multiwords.length === 0) return <div className="h-full flex items-center justify-center text-[#333]">-</div>;

                const firstMw = multiwords[0];
                const remaining = multiwords.length - 1;
                const themes = firstMw.occurrences.map(o => o.theme).join(", ");
                const text = `Multiword: ${firstMw.multiword} (${themes})`;

                // Link for exact theme filtering
                const filterLink = `/themes?theme=${encodeURIComponent(row.original.theme)}&exact=true`;

                return (
                    <div className="h-full flex items-center gap-2 px-3 py-1">
                        <div className="flex flex-col text-[10px] leading-tight min-w-0" title={text}>
                            <div className="flex items-center gap-1.5 truncate">
                                <span className="text-white font-mono truncate">{firstMw.multiword}</span>
                                <span className="text-[#666] truncate">({themes})</span>
                            </div>
                        </div>

                        {remaining > 0 && (
                            <a
                                href={filterLink}
                                className="shrink-0 flex items-center justify-center h-4 px-1.5 text-[9px] font-bold text-black bg-white hover:bg-[#ccc] rounded-sm transition-colors"
                                title={`Show all ${multiwords.length} multiwords`}
                            >
                                +{remaining}
                            </a>
                        )}
                    </div>
                );
            },
        },
    ];

    const langColumns: ColumnDef<ThemeRow>[] = languageKeys.map((lang) => ({
        id: `lang_${lang}`,
        accessorFn: (row) => row.translations[lang]?.translation,
        header: getLangLabel(lang),
        size: 200,
        cell: ({ row }) => {
            const t = row.original.translations[lang];
            if (!t) return <div className="h-full flex items-center px-3 text-[#333]">-</div>;

            const approved = t.is_approved as any;
            const isApproved = approved === true || approved === 1 || approved === "true";

            return (
                <div
                    className={cn(
                        "h-full flex items-center px-3 w-full transition-colors truncate",
                        !isApproved ? "text-[#ccc] bg-[#222]" : "text-[#ccc] hover:text-white"
                    )}
                    title={t.translation}
                >
                    {t.translation}
                </div>
            )
        }
    }));

    return [...baseColumns, ...langColumns];
};
