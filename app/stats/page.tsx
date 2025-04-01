"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
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

function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="flex items-center mt-4 gap-2 p-3 text-sm text-red-500 bg-red-50 dark:bg-red-950/50 rounded-md">
      <AlertCircle className="h-4 w-4" />
      {message}
    </div>
  );
}

function StatsDisplay({ stats }: { stats: any }) {
  const bbStats = stats.stats?.BuildBattle || {};
  const [avatarUrls, setAvatarUrls] = useState<{
    head: string;
    body: string;
  } | null>(null);

  useEffect(() => {
    async function fetchAvatars() {
      try {
        const response = await fetch(`/api/avatar/${stats.displayname}`);
        const data = await response.json();
        if (data.allUrls) {
          setAvatarUrls(data.allUrls);
        }
      } catch (error) {
        console.error("Failed to fetch avatars:", error);
      }
    }
    fetchAvatars();
  }, [stats.displayname]);

  const winPercentage = useMemo(() => {
    if (!bbStats.games_played || bbStats.games_played === 0) return 0;
    return ((bbStats.wins / bbStats.games_played) * 100).toFixed(2);
  }, [bbStats.games_played, bbStats.wins]);

  const averagePoint = useMemo(() => {
    if (!bbStats.score || !bbStats.games_played || bbStats.games_played === 0)
      return 0;
    return (bbStats.score / bbStats.games_played).toFixed(2);
  }, [bbStats.score, bbStats.games_played]);

  const cwValue = useMemo(() => {
    if (!bbStats.correct_guesses || bbStats.correct_guesses === 0) return 0;
    return (bbStats.correct_guesses / bbStats.wins_guess_the_build).toFixed(2);
  }, [bbStats.correct_guesses, bbStats.wins_guess_the_build]);

  // const acwValue = useMemo(() => {
  //   if (Number(cwValue) === 0) return 0;
  //   return (Number(averagePoint) / Number(cwValue)).toFixed(2);
  // }, [bbStats.correct_guesses, bbStats.games_played]);

  const bbTotalWins =
    (bbStats.wins_solo_normal || 0) +
    (bbStats.wins_teams_normal || 0) +
    (bbStats.wins_pro_mode || 0);
  const gtbTotalWins = bbStats.wins_guess_the_build || 0;
  const spbTotalWins = bbStats.wins_speed_builders || 0;

  const mainMode = useMemo(() => {
    const modes = [
      { name: "BB", wins: bbTotalWins },
      { name: "GTB", wins: gtbTotalWins },
      { name: "SPB", wins: spbTotalWins },
    ];
    const topMode = modes.reduce((prev, current) =>
      prev.wins > current.wins ? prev : current,
    );
    return topMode.wins > 0 ? topMode.name : null;
  }, [bbTotalWins, gtbTotalWins, spbTotalWins]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          {avatarUrls && (
            <div className="flex items-center flex-shrink-0">
              <img
                src={avatarUrls.head}
                alt={`${stats.displayname}'s head`}
                className="w-8 h-8 rounded-md flex-shrink-0"
                loading="lazy"
              />
            </div>
          )}
          <h2 className="text-xl font-bold break-all whitespace-pre-wrap">
            {stats.displayname}
          </h2>
        </div>
        {mainMode && (
          <span className="text-sm font-medium bg-primary/10 text-primary px-2 py-1 rounded">
            {mainMode} MAIN
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card className="p-3 space-y-1.5">
          <div className="text-sm space-y-1.5 flex flex-col h-full">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Total Score</span>
              <span>{bbStats.score?.toLocaleString() || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Language</span>
              <span>{stats.userLanguage || "N/A"}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Total Games</span>
              <span>{bbStats.games_played?.toLocaleString() || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Total Wins</span>
              <span>{bbStats.wins?.toLocaleString() || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Win Rate</span>
              <span>{winPercentage}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Average Score</span>
              <span>{averagePoint}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Coins</span>
              <span>{bbStats.coins?.toLocaleString() || 0}</span>
            </div>
            {/* <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Emblem Icon</span>
              <span>{bbStats.emblem?.selected_icon || "N/A"}</span>
            </div> */}

            <div className="flex-grow" />
            <img
              src={avatarUrls?.body}
              alt={`${stats.displayname}'s body`}
              className="w-16 mx-auto pb-2"
              loading="lazy"
            />
          </div>
        </Card>

        <div className="space-y-3">
          <Card className="p-3">
            <h3 className="text-sm font-medium flex items-center mb-1.5">
              <span className="bg-secondary px-1.5 py-0.5 rounded text-xs mr-2">
                BB
              </span>
              Build Battle
            </h3>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Total Votes</span>
                <span>{bbStats.total_votes?.toLocaleString() || 0}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Solo Wins</span>
                <span>{bbStats.wins_solo_normal || 0}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Solo Most Points</span>
                <span>{bbStats.solo_most_points || 0}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Team Wins</span>
                <span>{bbStats.wins_teams_normal || 0}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Team Most Points</span>
                <span>{bbStats.teams_most_points || 0}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Pro Wins</span>
                <span>{bbStats.wins_pro_mode || 0}</span>
              </div>
            </div>
          </Card>

          <Card className="p-3">
            <h3 className="text-sm font-medium flex items-center mb-1.5">
              <span className="bg-secondary px-1.5 py-0.5 rounded text-xs mr-2">
                GTB
              </span>
              Guess The Build
            </h3>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Wins</span>
                <span>{bbStats.wins_guess_the_build || 0}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Correct Guesses</span>
                <span>{bbStats.correct_guesses?.toLocaleString() || 0}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">C/W</span>
                <span>{cwValue}</span>
              </div>
            </div>
          </Card>

          <Card className="p-3">
            <h3 className="text-sm font-medium flex items-center mb-1.5">
              <span className="bg-secondary px-1.5 py-0.5 rounded text-xs mr-2">
                SPB
              </span>
              Speed Builders
            </h3>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Wins</span>
              <span>{bbStats.wins_speed_builders || 0}</span>
            </div>
          </Card>
        </div>
      </div>
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
      // If we have both username and API key, trigger search
      if (savedApiKey) {
        fetchStats(urlUsername, savedApiKey);
      }
    }
  }, [searchParams]);

  async function fetchStats(
    usernameToSearch: string = username,
    apiKeyToUse: string = apiKey,
  ) {
    usernameToSearch = usernameToSearch.trim();
    apiKeyToUse = apiKeyToUse.trim();
    if (!usernameToSearch || !apiKeyToUse) {
      setError("Please enter both username and API key");
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
    if (!stats || !apiKey) return;

    setDownloadLoading(true);
    try {
      const response = await fetch("/api/stats_img", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username,
          apiKey: apiKey,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate image");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${username}-stats.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to download image",
      );
    } finally {
      setDownloadLoading(false);
    }
  }

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col row-start-2 items-center w-full max-w-xl space-y-6">
        <h1 className="text-2xl font-bold mb-2.5">
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
                  placeholder="Hypixel API key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fetchStats()}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => fetchStats()}
                disabled={loading}
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
          <Card className="p-6 bg-background/95 rounded-lg w-full">
            <StatsDisplay stats={stats.player} />
          </Card>
        )}
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
