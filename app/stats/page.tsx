"use client";

import { useState, useEffect, Suspense, useRef } from "react";
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
} from "lucide-react";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { useSearchParams, useRouter } from "next/navigation";
import { toJpeg } from "html-to-image";
import { StatsDisplay } from "../components/stats-display";
import { useTheme } from "next-themes";
import Link from "next/link";

function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="flex items-center mt-4 gap-2 p-3 text-sm text-red-500 bg-red-50 dark:bg-red-950/50 rounded-md">
      <AlertCircle className="h-4 w-4" />
      {message}
    </div>
  );
}

function StatsContent() {
  const [username, setUsername] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloadLoading, setDownloadLoading] = useState(false);
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
      const response = await fetch("/api/stats", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: usernameToSearch,
          api_key: apiKeyToUse,
        }),
      });

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
      <main className="flex flex-col row-start-2 items-center w-full max-w-xl space-y-3">
        <h1 className="text-2xl font-bold mb-0.5">
          Build Battle Stats
          <ThemeSwitcher />
        </h1>

        {/* Search Card */}
        <Card className="p-6 bg-background/95 rounded-lg w-full">
          <div className="space-y-4">
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

          {error && <ErrorMessage message={error} />}
        </Card>

        {/* Stats Card */}
        {stats && (
          <Card className="p-0 bg-background/95 rounded-lg w-full">
            <div ref={statsRef} className="p-6">
              <StatsDisplay stats={stats.player} />
            </div>
          </Card>
        )}

        <Link
          href="/"
          className="mt-4 text-sm text-muted-foreground hover:underline"
        >
          GTB HINTTEST
        </Link>
      </main>
    </div>
  );
}

export default function Stats() {
  return (
    <Suspense fallback={<div />}>
      <StatsContent />
    </Suspense>
  );
}
