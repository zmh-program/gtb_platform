"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import {
  searchTranslations,
  removeAccents,
  type TranslationItem,
  LAST_UPDATED,
} from "@/lib/translations";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

const LANGUAGE_NAMES: Record<string, string> = {
  cs: "Czech",
  da: "Danish",

  de: "German",
  en: "Pirate English",
  es: "Spanish",
  fi: "Finnish",
  fr: "French",
  hu: "Hungarian",
  it: "Italian",
  ja: "Japanese",
  ko: "Korean",
  nl: "Dutch",
  no: "Norwegian",
  pl: "Polish",
  pt: "Portuguese",
  ro: "Romanian",
  ru: "Russian",
  sv: "Swedish",
  tr: "Turkish",
  uk: "Ukrainian",
  zh_cn: "Chinese Simplified",
  zh_tw: "Chinese Traditional",
};

export default function ThemesPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ThemesPageContent />
    </Suspense>
  );
}

function ThemesPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState(
    searchParams.get("theme") || "",
  );
  const [inputValue, setInputValue] = useState(searchQuery);
  const [results, setResults] = useState<TranslationItem[]>([]);
  const [openMultiwords, setOpenMultiwords] = useState<Record<string, boolean>>(
    {},
  );
  const [exactMatch, setExactMatch] = useState(
    searchParams.get("exact") === "true",
  );
  const [requestTime, setRequestTime] = useState<number | null>(null);

  useEffect(() => {
    const query = searchParams.get("theme") || "";
    const exact = searchParams.get("exact") === "true";
    setSearchQuery(query);
    setInputValue(query);
    setExactMatch(exact);
    if (query.length >= 2) {
      const startTime = performance.now();
      setResults(searchTranslations(query, exact));
      const endTime = performance.now();
      setRequestTime(endTime - startTime);
    } else {
      setResults([]);
      setRequestTime(null);
    }
  }, [searchParams]);

  const handleSearch = () => {
    if (inputValue.length < 2) {
      return;
    }
    const params = new URLSearchParams(searchParams);
    if (inputValue) {
      params.set("theme", inputValue);
    } else {
      params.delete("theme");
    }

    if (exactMatch) {
      params.set("exact", "true");
    } else {
      params.delete("exact");
    }

    router.push(`/themes?${params.toString()}`);
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

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col row-start-2 items-center w-full max-w-3xl space-y-3">
        <h1 className="text-2xl font-bold mb-0.5">
          GTB Theme Search Tool
          <ThemeSwitcher />
        </h1>

        <Card className="p-6 bg-background/95 rounded-lg w-full shadow-sm">
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Enter at least 2 characters to search themes..."
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
                <Label htmlFor="exact-match" className="text-sm cursor-pointer">
                  Exact match
                </Label>
              </div>
              <Button
                onClick={handleSearch}
                disabled={inputValue.length < 2}
                className="w-auto"
              >
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
          {results.map((item, index) => (
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
                  {Object.entries(item.translations).map(([lang, trans]) => (
                    <div
                      key={lang}
                      className="flex items-center p-3 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-[130px]">
                        <div className="rounded-full p-1">
                          <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                        <span className="text-sm font-medium text-muted-foreground">
                          {LANGUAGE_NAMES[lang]}
                        </span>
                      </div>
                      <span className="text-sm font-medium ml-auto mr-1">
                        {highlightMatch(trans.translation, searchQuery)}
                      </span>
                      <button
                        onClick={() => handleCopy(trans.translation)}
                        className="p-1 rounded-full hover:bg-muted/50 transition-colors"
                        aria-label={`Copy ${LANGUAGE_NAMES[lang]} translation`}
                      >
                        <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {searchQuery.length >= 2 && results.length === 0 && (
          <Card className="p-6 bg-background/95 rounded-lg w-full shadow-sm">
            <p className="text-center text-muted-foreground">
              No themes found matching {searchQuery}
              {exactMatch && " (exact match)"}
            </p>
          </Card>
        )}

        {(!searchQuery || searchQuery.length < 2) && (
          <Card className="p-6 bg-background/95 rounded-lg w-full shadow-sm">
            <p className="text-center text-muted-foreground">
              Enter at least 2 characters to search themes
            </p>
          </Card>
        )}

        <div className="w-full text-center text-xs text-muted-foreground pt-2">
          {requestTime !== null && (
            <p>Request Time: {requestTime.toFixed(2)}ms</p>
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
                      Track and analyze your build battle stats
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
