"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  searchTranslations,
  removeAccents,
  patternSearchTranslations,
  SearchCondition,
} from "@/lib/translations";
import {
  LanguageSelect,
  languageOptions,
  languageOptionsWithComplement,
} from "@/components/ui/language-select";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Globe,
  ChevronDown,
  ChevronRight,
  Copy,
  BarChartIcon,
  Clapperboard,
  ArrowRight,
  LinkIcon,
  Plus,
  X,
} from "lucide-react";
import { ThemeSwitcher } from "@/components/theme-switcher";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { TranslationItem } from "@/lib/source/types";
import { LAST_UPDATED } from "@/lib/source/source";

const ITEMS_PER_PAGE = 50;

export default function ThemesPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState(
    searchParams.get("theme") || "",
  );
  const [inputValue, setInputValue] = useState(searchQuery);
  const [results, setResults] = useState<TranslationItem[]>([]);
  const [isEmptyResults, setIsEmptyResults] = useState(false);
  const [openMultiwords, setOpenMultiwords] = useState<Record<string, boolean>>(
    {},
  );
  const [exactMatch, setExactMatch] = useState(
    searchParams.get("exact") === "true",
  );
  const [searchMode, setSearchMode] = useState(
    searchParams.get("mode") || "regular",
  );
  const [searchConditions, setSearchConditions] = useState<SearchCondition[]>([
    { language: "default", pattern: searchParams.get("theme") || "" },
  ]);
  const [requestTime, setRequestTime] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(
    parseInt(searchParams.get("page") || "1", 10),
  );
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const query = searchParams.get("theme") || "";
    const exact = searchParams.get("exact") === "true";
    const mode = searchParams.get("mode") || "regular";
    const page = parseInt(searchParams.get("page") || "1", 10);

    setSearchQuery(query);
    setInputValue(query);
    setExactMatch(exact);
    setSearchMode(mode);
    setCurrentPage(page);
    setIsEmptyResults(false);

    // Update search conditions based on URL params (only for pattern mode)
    if (mode === "pattern") {
      try {
        const conditionsParam = searchParams.get("conditions");
        if (conditionsParam) {
          // Parse conditions from URL
          const conditionsData = JSON.parse(conditionsParam);
          const conditions = conditionsData.map((c: any) => ({
            language: c.l,
            pattern: c.p,
          }));
          setSearchConditions(conditions);
        } else {
          // Fallback to single condition from theme param
          const conditions = query
            ? [{ language: "default", pattern: query }]
            : [{ language: "default", pattern: "" }];
          setSearchConditions(conditions);
        }
      } catch (error) {
        // If JSON parsing fails, fallback to single condition
        const conditions = query
          ? [{ language: "default", pattern: query }]
          : [{ language: "default", pattern: "" }];
        setSearchConditions(conditions);
      }
    }
  }, [searchParams]);

  // Manual search function
  const performSearch = (overrideConditions?: SearchCondition[]) => {
    const mode = searchParams.get("mode") || "regular";
    const query = searchParams.get("theme") || "";
    const exact = searchParams.get("exact") === "true";
    const page = parseInt(searchParams.get("page") || "1", 10);

    const currentConditions = overrideConditions || searchConditions;
    console.log("performSearch called:", { mode, query, currentConditions });

    const hasValidSearch =
      mode === "pattern"
        ? currentConditions.some((c) => c.pattern.trim().length >= 1)
        : query.length >= 1;

    console.log("hasValidSearch:", hasValidSearch);

    if (hasValidSearch) {
      setIsLoading(true);
      const startTime = performance.now();

      // Save the conditions used for this search (for highlighting)
      if (mode === "pattern") {
        setSearchedConditions([...currentConditions]);
      } else {
        setSearchedConditions([]);
      }

      // Use appropriate search function based on mode
      let allResults;
      if (mode === "pattern") {
        console.log("Pattern search with conditions:", currentConditions);
        allResults = patternSearchTranslations(currentConditions);
        console.log(
          "Pattern search results:",
          allResults.length,
          allResults.slice(0, 3),
        );
      } else {
        allResults = searchTranslations(query, exact);
      }

      console.log("allResults", allResults);

      setTotalPages(Math.ceil(allResults.length / ITEMS_PER_PAGE));

      // Paginate results
      const paginatedResults = allResults.slice(
        (page - 1) * ITEMS_PER_PAGE,
        page * ITEMS_PER_PAGE,
      );

      setResults(paginatedResults);
      setIsEmptyResults(paginatedResults.length === 0);
      const endTime = performance.now();
      setRequestTime(endTime - startTime);
      setIsLoading(false);
    } else {
      setResults([]);
      setRequestTime(null);
      setTotalPages(1);
      setSearchedConditions([]);
    }
  };

  // Only perform search when URL changes and there's already a search query
  useEffect(() => {
    const query = searchParams.get("theme") || "";
    const mode = searchParams.get("mode") || "regular";

    if (query) {
      if (mode === "pattern") {
        // For pattern mode, construct the conditions and pass them directly
        try {
          const conditionsParam = searchParams.get("conditions");
          let conditions: SearchCondition[];
          if (conditionsParam) {
            const conditionsData = JSON.parse(conditionsParam);
            conditions = conditionsData.map((c: any) => ({
              language: c.l,
              pattern: c.p,
            }));
          } else {
            conditions = [{ language: "default", pattern: query }];
          }
          performSearch(conditions);
        } catch (error) {
          const conditions = [{ language: "default", pattern: query }];
          performSearch(conditions);
        }
      } else {
        performSearch();
      }
    }
  }, [searchParams]);

  const handleSearch = () => {
    if (searchMode === "pattern") {
      // For pattern search, check if any condition has a pattern
      if (!searchConditions.some((c) => c.pattern.trim().length >= 1)) {
        return;
      }
    } else {
      // For regular search, check input value
      if (inputValue.trim().length < 1) {
        return;
      }
    }

    const params = new URLSearchParams(searchParams);

    if (searchMode === "pattern") {
      // For pattern search, encode all conditions in URL
      const validConditions = searchConditions.filter((c) => c.pattern.trim());
      if (validConditions.length > 0) {
        // Encode conditions as JSON in URL
        const conditionsData = validConditions.map((c) => ({
          l: c.language,
          p: c.pattern,
        }));
        params.set("conditions", JSON.stringify(conditionsData));
        // Keep first pattern in theme for backward compatibility
        params.set("theme", validConditions[0].pattern);
      } else {
        params.delete("conditions");
        params.delete("theme");
      }
    } else {
      // For regular search
      if (inputValue) {
        params.set("theme", inputValue);
      } else {
        params.delete("theme");
      }
    }

    if (exactMatch && searchMode === "regular") {
      params.set("exact", "true");
    } else {
      params.delete("exact");
    }

    if (searchMode !== "regular") {
      params.set("mode", searchMode);
    } else {
      params.delete("mode");
    }

    // Reset to page 1 when performing a new search
    params.set("page", "1");

    router.push(`/themes?${params.toString()}`);

    // Perform search immediately after URL update
    setTimeout(() => performSearch(), 0);
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", page.toString());
    router.push(`/themes?${params.toString()}`);
  };

  const handleSearchModeChange = (mode: string) => {
    const params = new URLSearchParams(searchParams);

    if (mode !== "regular") {
      params.set("mode", mode);
    } else {
      params.delete("mode");
    }

    // Remove exact match parameter when switching to pattern mode
    if (mode === "pattern") {
      params.delete("exact");
    }

    // Reset to page 1 when changing search mode
    params.set("page", "1");

    router.push(`/themes?${params.toString()}`);
  };

  // Functions to manage search conditions for pattern search
  const addSearchCondition = () => {
    setSearchConditions([
      ...searchConditions,
      { language: "default", pattern: "" },
    ]);
  };

  const removeSearchCondition = (index: number) => {
    if (searchConditions.length > 1) {
      const newConditions = searchConditions.filter((_, i) => i !== index);
      setSearchConditions(newConditions);
    }
  };

  const updateSearchCondition = (
    index: number,
    field: keyof SearchCondition,
    value: string,
  ) => {
    console.log("updateSearchCondition", index, field, value);
    const newConditions = [...searchConditions];
    newConditions[index] = { ...newConditions[index], [field]: value };
    setSearchConditions(newConditions);
  };

  // Get searched languages (for fold logic)
  const getSearchedLanguages = (item: TranslationItem) => {
    const searchedLanguages = new Set<string>();

    // Add English for theme display
    searchedLanguages.add("default");

    // Add languages from searched conditions (not current state)
    searchedConditions.forEach((condition) => {
      if (condition.pattern.trim() && condition.language !== "default") {
        const langCode = Object.entries(languageOptions).find(
          ([key, _]) => key === condition.language,
        )?.[0];
        if (
          langCode &&
          item.translations[langCode as keyof typeof item.translations]
        ) {
          searchedLanguages.add(langCode);
        }
      }
    });

    return Array.from(searchedLanguages).filter(
      (langCode) =>
        item.translations[langCode as keyof typeof item.translations],
    );
  };

  // Get non-searched languages (for fold expansion)
  const getNonSearchedLanguages = (item: TranslationItem) => {
    const searchedLangs = new Set(getSearchedLanguages(item));
    return Object.keys(item.translations).filter(
      (lang) => !searchedLangs.has(lang),
    );
  };

  // Highlight pattern matches in text with optimized consecutive merging
  const highlightPatternMatch = (text: string, condition: SearchCondition) => {
    if (!condition.pattern.trim() || searchMode !== "pattern") {
      return highlightMatch(text, searchQuery);
    }

    let pattern = condition.pattern.toLowerCase().trim();

    // Handle space wildcard suffix
    if (pattern.endsWith("!")) {
      pattern = pattern.slice(0, -1).trim();
    }

    // Apply digit filtering
    pattern = pattern.replace(/-/g, " ").replace(/\d{1,2}/g, (match) => {
      const num = parseInt(match);
      return "_".repeat(num);
    });

    const normalizedText = removeAccents(text).toLowerCase();

    if (normalizedText.length !== pattern.length) {
      return text;
    }

    const result = [];
    let i = 0;

    while (i < text.length) {
      const char = text[i];
      const patternChar = pattern[i];

      if (patternChar === "_") {
        // Wildcard match - collect consecutive wildcards
        let wildcardText = "";

        while (i < text.length && pattern[i] === "_") {
          wildcardText += text[i];
          i++;
        }

        result.push(
          <span key={i} className="bg-blue-200 dark:bg-blue-800 rounded px-0.5">
            {wildcardText}
          </span>,
        );
      } else if (patternChar === normalizedText[i]) {
        // Exact match - collect consecutive exact matches
        let exactText = "";

        while (
          i < text.length &&
          pattern[i] !== "_" &&
          pattern[i] === normalizedText[i]
        ) {
          exactText += text[i];
          i++;
        }

        result.push(
          <mark
            key={i}
            className="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5"
          >
            {exactText}
          </mark>,
        );
      } else {
        result.push(char);
        i++;
      }
    }

    return result;
  };

  // State for folding language displays
  const [foldedCards, setFoldedCards] = useState<Record<number, boolean>>({});
  const [searchedConditions, setSearchedConditions] = useState<
    SearchCondition[]
  >([]);

  const toggleCardFold = (index: number) => {
    setFoldedCards((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;
    const normalizedQuery = removeAccents(query);
    const normalizedText = removeAccents(text);
    const regex = new RegExp(`(${normalizedQuery})`, "gi");
    const parts = normalizedText.split(regex);

    // Track position in original text to extract corresponding substrings
    let pos = 0;
    return parts.map((part, i) => {
      const originalPart = text.substring(pos, pos + part.length);
      pos += part.length;

      return regex.test(part) ? (
        <mark
          key={i}
          className="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5"
        >
          {originalPart}
        </mark>
      ) : (
        originalPart
      );
    });
  };

  const handleCopy = (text: string) => {
    try {
      // Modern clipboard API
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard
          .writeText(text)
          .then(() => {
            toast.success("Copied to clipboard");
          })
          .catch(() => {
            // Fallback for browsers where clipboard API fails
            fallbackCopyTextToClipboard(text);
          });
      } else {
        // Fallback for browsers without clipboard API
        fallbackCopyTextToClipboard(text);
      }
    } catch (err) {
      console.error("Failed to copy text: ", err);
      toast.error("Failed to copy to clipboard");
    }
  };

  // Fallback method using document.execCommand
  const fallbackCopyTextToClipboard = (text: string) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;

    // Make the textarea out of viewport
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      const successful = document.execCommand("copy");
      if (successful) {
        toast.success("Copied to clipboard");
      } else {
        toast.error("Failed to copy to clipboard");
      }
    } catch (err) {
      console.error("Fallback: Oops, unable to copy", err);
      toast.error("Failed to copy to clipboard");
    }

    document.body.removeChild(textArea);
  };

  // Generate pagination items
  const renderPaginationItems = () => {
    const items = [];
    const maxVisiblePages = 5;

    // Always show first page
    items.push(
      <PaginationItem key="first">
        <PaginationLink
          onClick={() => handlePageChange(1)}
          isActive={currentPage === 1}
        >
          1
        </PaginationLink>
      </PaginationItem>,
    );

    // Calculate range of visible pages
    const startPage = Math.max(
      2,
      currentPage - Math.floor(maxVisiblePages / 2),
    );
    const endPage = Math.min(totalPages - 1, startPage + maxVisiblePages - 3);

    // Adjust if we're near the beginning
    if (startPage > 2) {
      items.push(
        <PaginationItem key="ellipsis-start">
          <PaginationEllipsis />
        </PaginationItem>,
      );
    }

    // Add middle pages
    for (let i = startPage; i <= endPage; i++) {
      items.push(
        <PaginationItem key={i}>
          <PaginationLink
            onClick={() => handlePageChange(i)}
            isActive={currentPage === i}
          >
            {i}
          </PaginationLink>
        </PaginationItem>,
      );
    }

    // Add ellipsis if needed
    if (endPage < totalPages - 1) {
      items.push(
        <PaginationItem key="ellipsis-end">
          <PaginationEllipsis />
        </PaginationItem>,
      );
    }

    // Always show last page if there's more than one page
    if (totalPages > 1) {
      items.push(
        <PaginationItem key="last">
          <PaginationLink
            onClick={() => handlePageChange(totalPages)}
            isActive={currentPage === totalPages}
          >
            {totalPages}
          </PaginationLink>
        </PaginationItem>,
      );
    }

    return items;
  };

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col row-start-2 items-center w-full max-w-2xl space-y-3">
        <h1 className="text-xl sm:text-2xl font-bold mb-0.5 flex items-center gap-2">
          GTB Theme Search Engine
          <ThemeSwitcher />
        </h1>

        <Card className="p-6 bg-background/95 rounded-lg w-full shadow-sm">
          <Tabs
            value={searchMode}
            onValueChange={handleSearchModeChange}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="regular">Regular</TabsTrigger>
              <TabsTrigger value="pattern">Pattern</TabsTrigger>
            </TabsList>

            <TabsContent value="regular" className="space-y-4 mt-4">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Enter exact or partial theme name..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-8"
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="exact-match"
                    checked={exactMatch}
                    onCheckedChange={setExactMatch}
                  />
                  <Label
                    htmlFor="exact-match"
                    className="text-sm cursor-pointer"
                  >
                    Exact match
                  </Label>
                </div>
                <Button
                  onClick={handleSearch}
                  disabled={inputValue.trim().length < 1}
                  className="w-auto"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="pattern" className="space-y-3 mt-4">
              {searchConditions.map((condition, index) => (
                <div key={index} className="flex items-center gap-2">
                  <LanguageSelect
                    value={condition.language}
                    onValueChange={(value) =>
                      updateSearchCondition(index, "language", value)
                    }
                    className="w-[125px] md:w-[200px]"
                  />

                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Pattern: t_n_, 3a4, etc."
                      value={condition.pattern}
                      onChange={(e) =>
                        updateSearchCondition(index, "pattern", e.target.value)
                      }
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                      className="pl-8"
                    />
                  </div>

                  {searchConditions.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSearchCondition(index)}
                      className="px-2"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}

              <div className="flex items-center justify-between pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addSearchCondition}
                  className="flex items-center gap-1 text-xs"
                >
                  <Plus className="h-3 w-3" />
                  Add
                </Button>

                <Button
                  onClick={handleSearch}
                  disabled={
                    !searchConditions.some((c) => c.pattern.trim().length >= 1)
                  }
                  className="w-auto"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
              </div>

              <div className="text-xs text-muted-foreground pt-1">
                <strong>Tips</strong>
                <br />
                <span className="text-emerald-600 dark:text-emerald-400">
                  _
                </span>
                : match any single character (e.g. t_n_ ={" "}
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                  t
                </span>
                e
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                  n
                </span>
                t,{" "}
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                  t
                </span>
                u
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                  n
                </span>
                e, etc.)
                <br />
                <span className="text-emerald-600 dark:text-emerald-400">
                  Numbers
                </span>
                : converted to underscores (e.g. 3a4 ={" "}
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                  ___
                </span>
                a
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                  ____
                </span>
                )
                <br />
                <span className="text-emerald-600 dark:text-emerald-400">
                  ! Prefix
                </span>
                : allow space-ignore mode in pattern (e.g. !c___ ___ = c___ ___
                + c___
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                  _
                </span>
                ___)
                <br />
                <span className="text-emerald-600 dark:text-emerald-400">
                  +/- Buttons
                </span>
                : Add/Remove language conditions
                <br />
                <span className="text-emerald-600 dark:text-emerald-400">
                  Multiple Languages
                </span>
                : Add conditions to filter themes matching all patterns across
                selected Languages
              </div>
            </TabsContent>
          </Tabs>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
          {results.map((item, index) => (
            // Item Result Card
            <Card
              key={index}
              className="w-full shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200"
            >
              <CardHeader className="p-4 bg-muted/50 border-b">
                <CardTitle className="text-lg font-medium flex items-center justify-between">
                  <span className="truncate mr-2">
                    {highlightMatch(item.theme, searchQuery)}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopy(item.theme)}
                      className="p-1 rounded-full hover:bg-muted/50 transition-colors"
                      aria-label="Copy theme"
                    >
                      <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                    {item.shortcut && (
                      <Badge
                        variant="secondary"
                        className="text-xs whitespace-nowrap"
                      >
                        {item.shortcut}
                      </Badge>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>

              <Collapsible
                className="bg-muted/30 border-b"
                open={openMultiwords[`item-${index}`]}
                defaultOpen={false}
                onOpenChange={(open) => {
                  setOpenMultiwords((prev) => ({
                    ...prev,
                    [`item-${index}`]: open,
                  }));
                }}
              >
                <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-2">
                    <LinkIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">
                      Multiwords
                    </span>
                    <Badge variant="outline" className="ml-2 text-xs">
                      {item.multiwords?.length || 0}
                    </Badge>
                  </div>
                  {openMultiwords[`item-${index}`] ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </CollapsibleTrigger>
                <CollapsibleContent>
                  {item.multiwords && item.multiwords.length > 0 ? (
                    <div className="space-y-2 p-3 pt-0">
                      {item.multiwords.map((multiword, idx) => (
                        <div key={idx} className="pl-5">
                          <div className="text-sm font-medium flex items-center">
                            <span className="mr-2">
                              {highlightMatch(multiword.multiword, searchQuery)}
                            </span>
                            <button
                              onClick={() => handleCopy(multiword.multiword)}
                              className="p-1 rounded-full hover:bg-muted/50 transition-colors"
                              aria-label="Copy multiword"
                            >
                              <Copy className="h-3 w-3 text-muted-foreground" />
                            </button>
                          </div>
                          <div className="pl-3 mt-1 space-y-1">
                            {multiword.occurrences.map((occurrence, occIdx) => (
                              <div
                                key={occIdx}
                                className="text-xs text-muted-foreground flex items-center gap-1"
                              >
                                <span className="text-muted-foreground/70">
                                  •
                                </span>
                                <span>
                                  {highlightMatch(
                                    occurrence.theme,
                                    searchQuery,
                                  )}
                                </span>
                                <span className="text-muted-foreground/70">
                                  ({occurrence.reference})
                                </span>
                                <button
                                  onClick={() => handleCopy(occurrence.theme)}
                                  className="p-0.5 rounded-full hover:bg-muted/50 transition-colors ml-1"
                                  aria-label="Copy theme occurrence"
                                >
                                  <Copy className="h-2.5 w-2.5 text-muted-foreground/70" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 text-sm text-muted-foreground text-center">
                      No multiwords available
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>

              <CardContent className="p-0">
                <div className="divide-y">
                  {searchMode === "pattern" ? (
                    <>
                      {/* Pattern Mode: Theme Display (English) */}
                      <div className="flex flex-wrap items-center p-3 hover:bg-muted/30 transition-colors bg-primary/5">
                        <div className="flex items-center gap-2 min-w-[130px]">
                          <div className="rounded-full p-1">
                            <Globe className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <span className="text-sm font-medium text-primary">
                            English (Theme)
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1 ml-auto">
                          <div className="flex items-center">
                            <span className="text-sm font-medium mr-1">
                              {highlightPatternMatch(
                                item.theme,
                                searchedConditions.find(
                                  (c) => c.language === "default",
                                ) || searchedConditions[0],
                              )}
                            </span>
                            <button
                              onClick={() => handleCopy(item.theme)}
                              className="p-1 rounded-full hover:bg-muted/50 transition-colors"
                              aria-label="Copy theme"
                            >
                              <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Pattern Mode: Language Translations with Fold */}
                      {(() => {
                        const searchedLangs = getSearchedLanguages(item).filter(
                          (lang: string) => lang !== "default",
                        );
                        const nonSearchedLangs = getNonSearchedLanguages(item);

                        // When folded: show searched languages
                        // When expanded: show searched + non-searched languages
                        const displayLangs = foldedCards[index]
                          ? [...searchedLangs, ...nonSearchedLangs]
                          : searchedLangs;

                        const isLongList = nonSearchedLangs.length > 0;

                        return (
                          <>
                            {displayLangs.map((lang) => {
                              const trans =
                                item.translations[
                                  lang as keyof typeof item.translations
                                ];
                              if (!trans) return null;

                              // Find matching search condition for this language (from searched conditions)
                              const matchingCondition = searchedConditions.find(
                                (c) => c.language === lang,
                              );

                              return (
                                <div
                                  key={lang}
                                  className="flex flex-wrap items-center p-3 hover:bg-muted/30 transition-colors"
                                >
                                  <div className="flex items-center gap-2 min-w-[130px]">
                                    <div className="rounded-full p-1">
                                      <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                                    </div>
                                    <span className="text-sm font-medium text-muted-foreground">
                                      {
                                        languageOptionsWithComplement[lang]
                                          .label
                                      }
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-1 ml-auto">
                                    <div className="flex items-center">
                                      <span className="text-sm font-medium mr-1">
                                        {matchingCondition
                                          ? highlightPatternMatch(
                                              trans.translation,
                                              matchingCondition,
                                            )
                                          : trans.translation}
                                      </span>
                                      <button
                                        onClick={() =>
                                          handleCopy(trans.translation)
                                        }
                                        className="p-1 rounded-full hover:bg-muted/50 transition-colors"
                                        aria-label={`Copy ${languageOptionsWithComplement[lang].label} translation`}
                                      >
                                        <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                                      </button>
                                    </div>
                                    {!trans.is_approved && (
                                      <Badge
                                        variant="outline"
                                        className="text-xs border-yellow-500 text-yellow-500 whitespace-nowrap"
                                      >
                                        Not Approved
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              );
                            })}

                            {/* Fold/Expand Button - Only for Pattern Mode */}
                            {isLongList && (
                              <div className="flex justify-center p-2 border-t bg-muted/20">
                                <button
                                  onClick={() => toggleCardFold(index)}
                                  className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  {foldedCards[index] ? (
                                    <>
                                      <ChevronDown className="h-3 w-3" />
                                      Show Less
                                    </>
                                  ) : (
                                    <>
                                      <ChevronRight className="h-3 w-3" />
                                      Show {nonSearchedLangs.length} More
                                      Languages
                                    </>
                                  )}
                                </button>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </>
                  ) : (
                    /* Regular Mode: Traditional Display - Show All Languages */
                    Object.entries(item.translations).map(([lang, trans]) => (
                      <div
                        key={lang}
                        className="flex flex-wrap items-center p-3 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-[130px]">
                          <div className="rounded-full p-1">
                            <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                          <span className="text-sm font-medium text-muted-foreground">
                            {languageOptionsWithComplement[lang].label}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1 ml-auto">
                          <div className="flex items-center">
                            <span className="text-sm font-medium mr-1">
                              {highlightMatch(trans.translation, searchQuery)}
                            </span>
                            <button
                              onClick={() => handleCopy(trans.translation)}
                              className="p-1 rounded-full hover:bg-muted/50 transition-colors"
                              aria-label={`Copy ${languageOptionsWithComplement[lang].label} translation`}
                            >
                              <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                            </button>
                          </div>
                          {!trans.is_approved && (
                            <Badge
                              variant="outline"
                              className="text-xs border-yellow-500 text-yellow-500 whitespace-nowrap"
                            >
                              Not Approved
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {isEmptyResults && (
          <Card className="p-6 bg-background/95 rounded-lg w-full shadow-sm">
            <p className="text-center text-muted-foreground">
              {`No themes found matching "${searchQuery}" using ${searchMode} search${exactMatch && searchMode === "regular" ? " (exact match)" : ""}`}
            </p>
          </Card>
        )}

        {(!searchQuery || searchQuery.length < 1) && (
          <Card className="p-6 bg-background/95 rounded-lg w-full shadow-sm">
            <p className="text-center text-muted-foreground">
              Enter your search query to find themes
            </p>
          </Card>
        )}

        {totalPages > 1 && (
          <Pagination className="mt-4">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() =>
                    currentPage > 1 && handlePageChange(currentPage - 1)
                  }
                  className={
                    currentPage === 1 ? "pointer-events-none opacity-50" : ""
                  }
                />
              </PaginationItem>

              {renderPaginationItems()}

              <PaginationItem>
                <PaginationNext
                  onClick={() =>
                    currentPage < totalPages &&
                    handlePageChange(currentPage + 1)
                  }
                  className={
                    currentPage === totalPages
                      ? "pointer-events-none opacity-50"
                      : ""
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}

        <div className="w-full text-center text-xs text-muted-foreground pt-2">
          {requestTime !== null && (
            <p>
              Request Time: {requestTime.toFixed(2)}ms ({results.length}{" "}
              {results.length > 1 ? "results" : "result"})
            </p>
          )}
          <p>Crowdin Translation Database Last Updated: {LAST_UPDATED}</p>
        </div>

        <div className="w-full pt-8 space-y-4">
          <Card className="bg-background/95 rounded-lg overflow-hidden hover:shadow-md transition-all duration-200">
            <Link href="/" className="block">
              <div className="flex items-center justify-between p-4 hover:bg-muted/50 rounded-md transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <Clapperboard className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">GTB Wordhint Training</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Practice guessing themes from word hints
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </Link>
          </Card>

          <Card className="bg-background/95 rounded-lg overflow-hidden hover:shadow-md transition-all duration-200">
            <Link href="/stats" className="block">
              <div className="flex items-center justify-between p-4 hover:bg-muted/50 rounded-md transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <BarChartIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">
                      Build Battle Statistic Tracker
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Track and analyze your Build Battle statistics
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </Link>
          </Card>
        </div>
      </main>
    </div>
  );
}
