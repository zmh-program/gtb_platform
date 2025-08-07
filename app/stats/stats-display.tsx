"use client";

import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";

export function StatsDisplay({ stats }: { stats: any }) {
  const bbStats = stats.stats?.BuildBattle || {};
  const [avatarUrls, setAvatarUrls] = useState<{
    head: string;
    body: string;
  } | null>(null);
  const [copiedUuid, setCopiedUuid] = useState(false);

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

  const copyUuid = async () => {
    if (stats.uuid) {
      try {
        await navigator.clipboard.writeText(stats.uuid);
        setCopiedUuid(true);
        setTimeout(() => setCopiedUuid(false), 2000);
      } catch (error) {
        console.error("Failed to copy UUID:", error);
      }
    }
  };

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

  const bbTotalWins =
    (bbStats.wins_solo_normal || 0) +
    (bbStats.wins_teams_normal || 0) +
    (bbStats.wins_solo_pro || 0);
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
                // loading="lazy"
              />
            </div>
          )}
          <h2 className="text-xl font-bold break-all whitespace-pre-wrap">
            {stats.displayname}
          </h2>
        </div>
        {mainMode && (
          <span className="text-sm font-medium bg-primary/10 text-primary px-2 py-1 mt-1.5 sm:mt-0 rounded">
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
              <span className="text-muted-foreground">UUID</span>
              <div className="flex items-center gap-1">
                <span className="text-xs font-mono">
                  {stats.uuid ? `${stats.uuid.slice(0, 8)}...` : "N/A"}
                </span>
                {stats.uuid && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-4 w-4 p-0"
                    onClick={copyUuid}
                  >
                    {copiedUuid ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                )}
              </div>
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

            <div className="flex-grow" />
            <img
              src={avatarUrls?.body}
              alt={`${stats.displayname}'s body`}
              className="w-16 mx-auto pb-2"
              // loading="lazy"
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
                <span>{bbStats.wins_solo_pro || 0}</span>
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
