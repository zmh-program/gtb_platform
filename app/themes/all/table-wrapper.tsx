"use client";

import { useMemo } from "react";
import { DataTable } from "./data-table";
import { createColumns, ThemeRow } from "./columns";

interface ThemesTableWrapperProps {
    data: ThemeRow[];
    languageKeys: string[];
}

export function ThemesTableWrapper({
    data,
    languageKeys,
}: ThemesTableWrapperProps) {
    const columns = useMemo(() => createColumns(languageKeys), [languageKeys]);

    return <DataTable columns={columns} data={data} />;
}
