"use client";

import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    useReactTable,
    getSortedRowModel,
    SortingState,
    VisibilityState,
    getFilteredRowModel,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef, useState, useEffect } from "react";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Settings2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
}

export function DataTable<TData, TValue>({
    columns,
    data,
}: DataTableProps<TData, TValue>) {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
    const [globalFilter, setGlobalFilter] = useState("");

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        onSortingChange: setSorting,
        getSortedRowModel: getSortedRowModel(),
        onColumnVisibilityChange: setColumnVisibility,
        getFilteredRowModel: getFilteredRowModel(),
        onGlobalFilterChange: setGlobalFilter,
        state: {
            sorting,
            columnVisibility,
            globalFilter,
        },
    });

    const { rows } = table.getRowModel();

    const parentRef = useRef<HTMLDivElement>(null);

    const virtualizer = useVirtualizer({
        count: rows.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 35, // Dense row height
        overscan: 20,
    });

    return (
        <div className="flex flex-col h-full bg-[#1c1c1c] border border-[#333] rounded-md overflow-hidden font-mono text-sm shadow-2xl">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#1c1c1c] border-b border-[#333] gap-4">
                <div className="flex items-center flex-1 gap-2 max-w-sm">
                    <div className="relative w-full">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#666]" />
                        <Input
                            placeholder="Filter themes..."
                            value={globalFilter ?? ""}
                            onChange={(event) => setGlobalFilter(event.target.value)}
                            className="h-8 pl-8 bg-[#111] border-[#333] text-xs text-[#ccc] focus-visible:ring-1 focus-visible:ring-blue-900 focus-visible:border-blue-800 placeholder:text-[#444]"
                        />
                    </div>
                    <div className="text-[10px] text-[#666] whitespace-nowrap ml-2">
                        {rows.length} themes
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* Legend */}
                    <div className="hidden sm:flex items-center gap-3 text-[10px] text-[#666]">
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full border border-[#444] bg-transparent"></div>
                            <span>Approved</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-amber-500/20 border border-amber-500/50 text-amber-500"></div>
                            <span className="text-amber-500/80">Not Approved</span>
                        </div>
                    </div>

                    <div className="h-4 w-px bg-[#333] hidden sm:block"></div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-6 px-2 text-[10px] bg-[#222] border-[#333] text-[#888] hover:bg-[#2a2a2a] hover:text-[#ccc] hover:border-[#444] transition-colors"
                            >
                                <Settings2 className="h-3 w-3 mr-1.5" />
                                Columns
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            align="end"
                            className="bg-[#1c1c1c] border-[#333] text-[#ccc] max-h-[60vh] overflow-y-auto p-1 font-sans"
                        >
                            {table
                                .getAllColumns()
                                .filter((column) => column.getCanHide())
                                .map((column) => {
                                    // Fix: Ensure we get a string label for the column
                                    let label = column.id;
                                    if (column.id === 'theme') label = 'Theme';
                                    else if (column.id === 'shortcut') label = 'Shortcut';
                                    else if (column.id === 'multiwords') label = 'Multiword';
                                    else if (column.id.startsWith('lang_')) label = column.id.replace('lang_', '');

                                    return (
                                        <DropdownMenuCheckboxItem
                                            key={column.id}
                                            className="capitalize text-xs py-1.5 px-2 focus:bg-[#333] focus:text-white data-[state=checked]:text-blue-400 data-[state=checked]:bg-[#252525] rounded-sm cursor-pointer"
                                            checked={column.getIsVisible()}
                                            onCheckedChange={(value) =>
                                                column.toggleVisibility(!!value)
                                            }
                                        >
                                            <span className="truncate">{label}</span>
                                        </DropdownMenuCheckboxItem>
                                    );
                                })}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Table Area */}
            <div
                ref={parentRef}
                className="flex-1 overflow-auto bg-[#1a1a1a] custom-scrollbar"
            >
                <div
                    style={{
                        height: `${virtualizer.getTotalSize()}px`,
                        width: "100%",
                        position: "relative",
                    }}
                >
                    {/* Header */}
                    <div className="sticky top-0 z-10 grid bg-[#1c1c1c] border-b border-[#333] shadow-sm"
                        style={{
                            width: "100%",
                            display: 'flex'
                        }}
                    >
                        {table.getHeaderGroups().map((headerGroup) => (
                            <div key={headerGroup.id} className="contents">
                                {headerGroup.headers.map((header) => {
                                    const width = header.column.getSize();
                                    return (
                                        <div
                                            key={header.id}
                                            className="flex items-center px-3 py-2 text-[10px] font-bold text-[#666] uppercase tracking-wider border-r border-[#2a2a2a] bg-[#1c1c1c] select-none"
                                            style={{ width: header.id === 'theme' || header.id === 'shortcut' || header.id === 'multiwords' ? width : 200, flexShrink: 0 }}
                                        >
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>

                    {/* Rows */}
                    {virtualizer.getVirtualItems().map((virtualRow) => {
                        const row = rows[virtualRow.index];
                        return (
                            <div
                                key={row.id}
                                className="absolute top-0 left-0 w-full flex border-b border-[#222] hover:bg-[#222] transition-colors group"
                                style={{
                                    height: `${virtualRow.size}px`,
                                    transform: `translateY(${virtualRow.start}px)`,
                                }}
                            >
                                {row.getVisibleCells().map((cell) => {
                                    const width = cell.column.getSize();
                                    return (
                                        <div
                                            key={cell.id}
                                            className="flex items-center text-xs text-[#aaa] border-r border-[#222] truncate group-hover:border-[#2a2a2a]"
                                            style={{ width: cell.column.id === 'theme' || cell.column.id === 'shortcut' || cell.column.id === 'multiwords' ? width : 200, flexShrink: 0 }}
                                        >
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext()
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            </div>


        </div>
    );
}
