"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Search,
  User,
  Key,
  AlertCircle,
  Loader2,
  Download,
  ArrowRight,
  Clapperboard,
} from "lucide-react";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { useSearchParams, useRouter } from "next/navigation";
import { toJpeg } from "html-to-image";
import { StatsDisplay } from "./stats-display";
import { useTheme } from "next-themes";
import Link from "next/link";
import { SearchHistory } from "@/components/search-history";
import { addToSearchHistory } from "@/lib/history";
import { StatsTimeline } from "./stats-timeline";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

function formatLastUpdate(timestamp: number): string {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const diffSeconds = Math.max(0, nowSeconds - timestamp);
  if (diffSeconds <= 20) return "now";
  if (diffSeconds <= 60) return `${diffSeconds}s`;
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}min`;
  return `${Math.floor(diffSeconds / 3600)}h`;
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="flex items-center mt-4 gap-2 p-3 text-sm text-red-500 bg-red-50 dark:bg-red-950/50 rounded-md break-all">
      <AlertCircle className="h-4 w-4 shrink-0" />
      {message}
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="space-y-4 w-full">
      <div className="flex justify-end">
        <Skeleton className="h-4 w-32" />
      </div>
      <Card className="bg-background/95 rounded-lg w-full overflow-hidden p-6 space-y-6">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 w-full">
            <Skeleton className="h-12 w-12 rounded-lg" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <Skeleton className="h-10 w-32" />
        </div>

        {/* Bar Skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-full rounded-full" />
          <div className="flex justify-between">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>

        {/* Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Skeleton className="h-40 w-full" />
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
      </Card>

      {/* Timeline Skeleton */}
      <div className="space-y-4 mt-12">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-6 w-24" />
        </div>
        <div className="ml-3 space-y-8 pb-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="pl-8 relative">
              <div className="border-l-2 border-muted absolute left-0 top-0 h-full" />
              <div className="absolute -left-[9px] top-1 h-4 w-4 rounded-full bg-muted" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-6 w-full max-w-sm" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function StatsContent() {
  const [username, setUsername] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [refreshHistory, setRefreshHistory] = useState(0);
  const searchParams = useSearchParams();
  const router = useRouter();
  const statsRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();

  useEffect(() => {
    if (apiKey || username) return;

    const savedApiKey = localStorage.getItem("hypixel_api_key");
    if (savedApiKey) {
      setApiKey(savedApiKey);
    }

    // Check for username in URL
    const urlUsername = searchParams.get("u");
    if (urlUsername) {
      setUsername(urlUsername);
      fetchStats(urlUsername, savedApiKey || "");
    }
  }, [searchParams]);

  async function fetchStats(
    usernameToSearch: string = username,
    apiKeyToUse: string = apiKey,
  ) {
    usernameToSearch = usernameToSearch.trim();
    apiKeyToUse = apiKeyToUse.trim();
    if (!usernameToSearch) {
      setError("Please enter a username");
      return;
    }

    setError(null);
    setStats(null);
    setLoading(true);

    try {
      const response = await fetch(
        `/api/stats?username=${usernameToSearch}&api_key=${apiKeyToUse}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch stats");
      }

      // Save API key to localStorage on successful request
      localStorage.setItem("hypixel_api_key", apiKeyToUse);

      if (data.player?.stats?.BuildBattle) {
        console.log(data.player.stats.BuildBattle);
      }

      setStats(data);

      // Fetch history
      if (data.player?.uuid) {
        try {
          const histRes = await fetch(
            `/api/stats/history?uuid=${data.player.uuid}`,
          );
          if (histRes.ok) {
            const histData = await histRes.json();
            setHistory(histData.history || []);
          }
        } catch (e) {
          console.error("Failed to fetch history", e);
        }
      }

      // Save to history - use UUID from stats data
      const respUuid: string | undefined = data.player?.uuid;
      const respUsername: string | undefined = data.player?.displayname;

      if (respUuid && respUsername) {
        try {
          addToSearchHistory(respUuid, respUsername);
          setRefreshHistory((prev) => prev + 1);
        } catch (error) {
          console.warn("Failed to add to history:", error);
        }
      }

      // Update URL with username parameter without refreshing the page
      const params = new URLSearchParams(searchParams.toString());
      params.set("u", usernameToSearch);
      router.push(`?${params.toString()}`, { scroll: false });
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to fetch player stats",
      );
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  const handleHistoryPlayerSelect = (uuid: string, username: string) => {
    // Normalize UUIDs for comparison (remove dashes and convert to lowercase)
    const normalizeUuid = (uuid: string) =>
      uuid.replace(/-/g, "").toLowerCase().trim();

    if (stats?.uuid && normalizeUuid(stats.uuid) === normalizeUuid(uuid)) {
      return;
    }

    setUsername(username);
    fetchStats(uuid, apiKey);
  };

  async function downloadStatsImage() {
    if (!statsRef.current) return;

    setDownloadLoading(true);
    try {
      const isDark =
        theme === "dark" ||
        (theme === "system" &&
          window.matchMedia("(prefers-color-scheme: dark)").matches);
      const originalStyle = statsRef.current.style.cssText;
      statsRef.current.style.backgroundColor = isDark
        ? "rgb(5, 5, 5)"
        : "rgb(250, 250, 250)";

      const dataUrl = await toJpeg(statsRef.current, {
        quality: 1.0,
        pixelRatio: 2,
        skipAutoScale: true,
      });

      // Restore original styles
      statsRef.current.style.cssText = originalStyle;

      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `${stats.player.displayname}_stats.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Failed to download stats image:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to download stats image. Please try again.",
      );
    } finally {
      setDownloadLoading(false);
    }
  }

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col row-start-2 items-center w-full max-w-2xl space-y-4">
        <h1 className="text-xl sm:text-2xl font-bold mb-2.5 flex items-center gap-2 text-center">
          Build Battle Statistic Tracker
          <ThemeSwitcher />
        </h1>

        {/* Search Card */}
        <Card className="p-6 bg-background/95 rounded-lg w-full">
          <div className="space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="relative">
                <User className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Minecraft username or UUID"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fetchStats()}
                />
              </div>
              <div className="relative">
                <Key className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  type="password"
                  placeholder="[Optional] Hypixel API key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fetchStats()}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => fetchStats()}
                disabled={loading || !username}
                className="flex-1"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Search className="h-4 w-4 mr-2" />
                )}
                {loading ? "Searching..." : "Search"}
              </Button>
              {stats && (
                <Button
                  onClick={downloadStatsImage}
                  disabled={downloadLoading}
                  variant="outline"
                >
                  {downloadLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </Card>

        {/* Search History */}
        <SearchHistory
          key={refreshHistory}
          onPlayerSelect={handleHistoryPlayerSelect}
        />

        {loading && !stats && <StatsSkeleton />}

        {/* Stats Card */}
        {stats && (
          <>
            {stats.lastUpdated && (
              <div className="text-right w-full translate-y-2.5">
                <span className="text-xs text-muted-foreground">
                  last update: {formatLastUpdate(stats.lastUpdated)}
                </span>
              </div>
            )}
            <Card className="bg-background/95 rounded-lg w-full overflow-hidden">
              <div ref={statsRef} className="p-6">
                <StatsDisplay stats={stats.player} />
              </div>
            </Card>

            <StatsTimeline history={history} />
          </>
        )}

        <div className="w-full mt-8 space-y-4">
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
            <Link href="/themes" className="block">
              <div className="flex items-center justify-between p-4 hover:bg-muted/50 rounded-md transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <Search className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">GTB Theme Search Engine</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Search GTB themes, translations, and more
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
