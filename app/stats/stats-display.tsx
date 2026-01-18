"use client";

import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { generateAvatarUrls } from "@/lib/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  mcColorMap,
  colorNames,
  buildBattleTitles,
  buildBattleEmblems,
} from "@/lib/hypixel-constants";

const ranks: Record<string, [string, string][]> = {
  ADMIN: [["c", "[ADMIN]"]],
  MODERATOR: [["2", "[MOD]"]],
  HELPER: [["9", "[HELPER]"]],
  JR_HELPER: [["9", "[JR HELPER]"]],
  YOUTUBER: [
    ["c", "["],
    ["f", "YOUTUBE"],
    ["c", "]"],
  ],
  SUPERSTAR: [
    ["%r", "[MVP"],
    ["%p", "++"],
    ["%r", "]"],
  ],
  MVP_PLUS: [
    ["b", "[MVP"],
    ["%p", "+"],
    ["b", "]"],
  ],
  MVP: [["b", "[MVP]"]],
  VIP_PLUS: [
    ["a", "[VIP"],
    ["6", "+"],
    ["a", "]"],
  ],
  VIP: [["a", "[VIP]"]],
  DEFAULT: [["7", ""]],
};

function parseMinecraftTag(tag: string): [string, string][] {
  const result: [string, string][] = [];
  const parts = tag.split(/§([a-f0-9])/);
  parts.unshift("f");
  for (let i = 0; i < parts.length; i += 2) {
    const color = parts[i] || "f";
    const text = parts[i + 1] || "";
    if (text) result.push([color, text]);
  }
  return result;
}

function replaceCustomColors(
  rank: [string, string][],
  p: string,
  r: string,
): [string, string][] {
  return rank.map(([color, text]) => [
    color === "%p" ? p : color === "%r" ? r : color,
    text,
  ]);
}

function calcRankTag(player: any): [string, string][] {
  if (!player || typeof player !== "object") return ranks.DEFAULT;
  const { rankPlusColor, monthlyRankColor, prefix } = player;
  let { packageRank, newPackageRank, monthlyPackageRank, rank } = player;
  if (rank === "NORMAL") rank = null;
  if (monthlyPackageRank === "NONE") monthlyPackageRank = null;
  if (packageRank === "NONE") packageRank = null;
  if (newPackageRank === "NONE") newPackageRank = null;
  if (prefix && typeof prefix === "string") return parseMinecraftTag(prefix);
  const key = rank || monthlyPackageRank || newPackageRank || packageRank;
  if (key && ranks[key]) {
    const p = colorNames[rankPlusColor] || "c";
    const r = colorNames[monthlyRankColor] || "6";
    return replaceCustomColors(ranks[key], p, r);
  }
  return ranks.DEFAULT;
}

function formatCosmetic(value: string | undefined, prefix: string): string {
  if (!value) return "N/A";
  const cleaned = value.replace(prefix, "").replace(/_/g, " ");
  if (cleaned === "none") return "N/A";
  return cleaned.replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatLastWon(
  timestamp: number | undefined,
): { ago: string; full: string } | null {
  if (!timestamp) return null;
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  let ago = "";
  if (days > 0) ago = `${days}d ago`;
  else if (hours > 0) ago = `${hours}h ago`;
  else if (minutes > 0) ago = `${minutes}m ago`;
  else ago = "just now";
  const date = new Date(timestamp);
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const full = date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });
  return { ago, full };
}

function parseLoadoutItem(item: string): { name: string; id: string } {
  if (!item || item === "AIR") return { name: "Empty", id: "air" };
  const parts = item.split(":");
  const baseName = parts[0].toLowerCase();
  const displayName = parts[0]
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return { name: displayName, id: baseName };
}

function getItemImageUrl(id: string): string {
  return `https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data/1.21.8/items/${id}.png`;
}

function getTitleInfo(score: number) {
  let currentTitle = buildBattleTitles[0];
  let nextTitle = buildBattleTitles[1];
  for (let i = buildBattleTitles.length - 1; i >= 0; i--) {
    if (score >= buildBattleTitles[i].req) {
      currentTitle = buildBattleTitles[i];
      nextTitle = buildBattleTitles[i + 1] || null;
      break;
    }
  }
  return { currentTitle, nextTitle };
}

type StatsDisplayProps = {
  stats: any;
};
export function StatsDisplay({ stats }: StatsDisplayProps) {
  const bbStats = stats.stats?.BuildBattle || {};
  const achievements = stats.achievements || {};

  const rankTag = useMemo(() => {
    const tag = calcRankTag(stats);
    if (tag.length === 1 && tag[0][1] === "") return null;
    return tag;
  }, [stats]);

  const [avatarUrls, setAvatarUrls] = useState<{
    head: string;
    body: string;
  } | null>(null);
  const [copiedUuid, setCopiedUuid] = useState(false);

  useEffect(() => {
    if (stats.uuid) {
      const urls = generateAvatarUrls(stats.uuid);
      setAvatarUrls(urls);
    }
  }, [stats.uuid]);

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

  const spbPerfectBuildTimes =
    achievements.buildbattle_speed_builders_perfectionist || 0;

  const pwValue = useMemo(() => {
    if (!spbPerfectBuildTimes || spbPerfectBuildTimes === 0) return 0;
    return (spbPerfectBuildTimes / bbStats.wins_speed_builders).toFixed(2);
  }, [spbPerfectBuildTimes, bbStats.wins_speed_builders]);

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

  const titleInfo = useMemo(() => {
    const score = bbStats.score || 0;
    const { currentTitle, nextTitle } = getTitleInfo(score);
    let progress = 100;
    let toGo = 0;
    if (nextTitle) {
      const range = nextTitle.req - currentTitle.req;
      const current = score - currentTitle.req;
      progress = Math.min(100, (current / range) * 100);
      toGo = nextTitle.req - score;
    }
    return { currentTitle, nextTitle, progress, toGo };
  }, [bbStats.score]);

  const emblem = bbStats.emblem || {};
  const emblemSymbol = emblem.selected_icon
    ? buildBattleEmblems[emblem.selected_icon]
    : null;
  const emblemColorCode = emblem.selected_color
    ? colorNames[emblem.selected_color]
    : null;
  const emblemColor = emblemColorCode
    ? mcColorMap[emblemColorCode]
    : titleInfo.currentTitle.color;

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
              />
            </div>
          )}
          <h2 className="text-xl font-bold break-all whitespace-pre-wrap">
            {rankTag && (
              <span className="mr-1">
                {rankTag.map(([color, text], i) => (
                  <span
                    key={i}
                    style={{ color: mcColorMap[color] || "#FFFFFF" }}
                  >
                    {text}
                  </span>
                ))}
              </span>
            )}
            {stats.displayname}
          </h2>
        </div>
        {mainMode && (
          <span className="text-sm font-medium bg-primary/10 text-primary px-2 py-1 mt-1.5 sm:mt-0 rounded">
            {mainMode} MAIN
          </span>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-sm">
          <div className="flex items-center gap-1.5">
            {emblemSymbol && (
              <span
                style={{ color: emblemColor }}
                title={emblem.selected_icon}
                className="font-bold"
              >
                {emblemSymbol}
              </span>
            )}
            <span style={{ color: titleInfo.currentTitle.color }}>
              {titleInfo.currentTitle.name}
            </span>
            {titleInfo.nextTitle && (
              <>
                <span className="text-muted-foreground">→</span>
                <span style={{ color: titleInfo.nextTitle.color }}>
                  {titleInfo.nextTitle.name}
                </span>
              </>
            )}
          </div>
          <span className="text-muted-foreground text-xs sm:text-sm">
            {titleInfo.nextTitle
              ? `${titleInfo.toGo.toLocaleString()} more`
              : "MAX"}
          </span>
        </div>
        <div className="flex items-center gap-0.5 md:gap-1">
          {Array.from({ length: 10 }).map((_, i) => {
            const segmentProgress = titleInfo.progress / 10;
            const filled = i < Math.floor(segmentProgress);
            const partial = i === Math.floor(segmentProgress);
            const alpha = partial ? segmentProgress % 1 : 0;
            let bg = "hsl(var(--secondary))";
            if (filled) {
              bg = "#7FFF00";
            } else if (partial && alpha > 0) {
              bg = `color-mix(in srgb, #7FFF00 ${alpha * 100}%, hsl(var(--secondary)))`;
            }
            return (
              <div
                key={i}
                className="h-1.5 flex-1 rounded-sm"
                style={{ backgroundColor: bg }}
              />
            );
          })}
        </div>
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
              <span className="text-muted-foreground">Super Votes</span>
              <span>{bbStats.super_votes?.toLocaleString() || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Coins</span>
              <span>{bbStats.coins?.toLocaleString() || 0}</span>
            </div>

            <div className="flex-grow" />
            <img
              src={avatarUrls?.body}
              alt={`${stats.displayname}'s body`}
              className="w-20 mx-auto pb-2"
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
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Perfect Builds</span>
              <span>{spbPerfectBuildTimes?.toLocaleString() || 0}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">P/W</span>
              <span>{pwValue}</span>
            </div>
          </Card>
        </div>
      </div>

      <fieldset className="border rounded-lg p-3 pt-2">
        <legend className="text-sm font-medium px-1">Cosmetics</legend>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground text-xs">Hat</span>
            <p>{formatCosmetic(bbStats.new_selected_hat, "hats_")}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">Trail</span>
            <p>
              {formatCosmetic(bbStats.active_movement_trail, "movement_trail_")}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">Backdrop</span>
            <p>{formatCosmetic(bbStats.selected_backdrop, "backdrops_")}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">Suit</span>
            <p>{formatCosmetic(bbStats.new_suit, "suits_")}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">Victory Dance</span>
            <p>{formatCosmetic(bbStats.new_victory_dance, "victory_dance_")}</p>
          </div>
        </div>
      </fieldset>

      {bbStats.buildbattle_loadout && (
        <fieldset className="border rounded-lg p-3 pt-2">
          <legend className="text-sm font-medium px-1">Loadout</legend>
          <TooltipProvider>
            <div className="flex flex-wrap justify-center gap-1 sm:gap-2 lg:gap-3 p-2 rounded">
              {bbStats.buildbattle_loadout.map((item: string, i: number) => {
                const parsed = parseLoadoutItem(item);
                const isAir = parsed.id === "air";
                return (
                  <Tooltip key={i}>
                    <TooltipTrigger asChild>
                      <div className="w-10 h-10 bg-secondary/30 border border-border/50 rounded flex items-center justify-center">
                        {!isAir && (
                          <>
                            <img
                              src={getItemImageUrl(parsed.id)}
                              alt={parsed.name}
                              className="w-8 h-8 brightness-110 contrast-110"
                              style={{ imageRendering: "pixelated" }}
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = "none";
                                const fallback =
                                  target.nextElementSibling as HTMLElement;
                                if (fallback)
                                  fallback.classList.remove("hidden");
                              }}
                            />
                            <span className="hidden text-[8px] text-center leading-tight">
                              {parsed.name}
                            </span>
                          </>
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-mono text-xs">{item}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </TooltipProvider>
        </fieldset>
      )}

      {bbStats.last_won && (
        <fieldset className="border rounded-lg p-3 pt-2">
          <legend className="text-sm font-medium px-1">Last Won</legend>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-sm">
            {[
              { key: "SOLO_NORMAL", label: "Solo" },
              { key: "TEAMS_NORMAL", label: "Teams" },
              { key: "SOLO_PRO", label: "Pro" },
              { key: "GUESS_THE_BUILD", label: "GTB" },
              { key: "SPEED_BUILDERS", label: "SPB" },
            ].map(({ key, label }) => {
              const info = formatLastWon(bbStats.last_won?.[key]);
              return (
                <div key={key}>
                  <span className="text-muted-foreground text-xs">{label}</span>
                  {info ? (
                    <p title={info.full}>{info.ago}</p>
                  ) : (
                    <p className="text-muted-foreground">N/A</p>
                  )}
                </div>
              );
            })}
          </div>
        </fieldset>
      )}
    </div>
  );
}
