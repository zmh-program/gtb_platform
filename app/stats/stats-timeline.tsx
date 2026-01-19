"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

import {
  mcColorMap,
  colorNames,
  buildBattleEmblems,
} from "@/lib/hypixel-constants";

type StatsSnapshot = {
  id: number;
  created_at: string;
  data: any;
};

type Diff = {
  key: string;
  label: string;
  oldValue: any;
  newValue: any;
  diff: number | string;
  type: "number" | "string" | "element";
  isInitial?: boolean;
};

function formatDiff(diff: any) {
  if (typeof diff === "number" && diff > 0) return `+${diff.toLocaleString()}`;
  if (typeof diff === "number" && diff < 0) return diff.toLocaleString();
  return diff?.toString();
}

function getDiffs(current: any, previous: any): Diff[] {
  const diffs: Diff[] = [];
  const currBb = current?.stats?.BuildBattle || {};
  const prevBb = previous?.stats?.BuildBattle || {};

  const numericFields = [
    { key: "score", label: "Score" },
    { key: "games_played", label: "Games" },
    { key: "wins", label: "Wins" },
    { key: "coins", label: "Coins" },
    { key: "super_votes", label: "Super Votes" },
    { key: "total_votes", label: "Votes" },
    { key: "correct_guesses", label: "Correct Guess" },
    { key: "wins_guess_the_build", label: "GTB" },
    { key: "wins_speed_builders", label: "SPB" },
    { key: "wins_solo_normal", label: "Solo" },
    { key: "wins_teams_normal", label: "Teams" },
    { key: "wins_solo_pro", label: "Pro" },
  ];

  numericFields.forEach(({ key, label }) => {
    const currVal = Number(currBb[key] || 0);
    const prevVal = Number(prevBb[key] || 0);

    if (previous) {
      if (currVal !== prevVal) {
        diffs.push({
          key,
          label,
          oldValue: prevVal,
          newValue: currVal,
          diff: currVal - prevVal,
          type: "number",
        });
      }
    } else if (currVal > 0) {
      diffs.push({
        key,
        label,
        oldValue: 0,
        newValue: currVal,
        diff: 0,
        type: "number",
        isInitial: true,
      });
    }
  });

  const buildBattleEmblems: Record<string, string> = {
    ALPHA: "α",
    OMEGA: "Ω",
    REMINISCENCE: "≈",
    RICH: "$",
    PODIUM: "π",
    FLORIN: "ƒ",
  };

  const stringFields = [
    { key: "new_selected_hat", label: "Hat" },
    { key: "active_movement_trail", label: "Trail" },
    { key: "selected_backdrop", label: "Backdrop" },
    { key: "new_suit", label: "Suit" },
    { key: "new_victory_dance", label: "Dance" },
  ];

  stringFields.forEach(({ key, label }) => {
    const currVal = currBb[key];
    const prevVal = prevBb[key];

    const clean = (val: string) =>
      val
        .replace("backdrops_", "")
        .replace("hats_", "")
        .replace("suits_", "")
        .replace("victory_dance_", "")
        .replace("movement_trail_", "")
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c: string) => c.toUpperCase());

    if (previous) {
      if (currVal !== prevVal && currVal) {
        diffs.push({
          key,
          label,
          oldValue: prevVal,
          newValue: clean(currVal),
          diff: clean(currVal),
          type: "string",
        });
      }
    } else if (currVal) {
      diffs.push({
        key,
        label,
        oldValue: null,
        newValue: clean(currVal),
        diff: clean(currVal),
        type: "string",
        isInitial: true,
      });
    }
  });

  const currEmblem = currBb.emblem || {};
  const prevEmblem = prevBb.emblem || {};
  const currIcon = currEmblem.selected_icon;
  const prevIcon = prevEmblem.selected_icon;
  const currColorName = currEmblem.selected_color;
  const prevColorName = prevEmblem.selected_color;

  let showEmblem = false;
  let isInit = false;

  if (previous) {
    if ((currIcon !== prevIcon || currColorName !== prevColorName) && currIcon) {
      showEmblem = true;
    }
  } else if (currIcon) {
    showEmblem = true;
    isInit = true;
  }

  if (showEmblem) {
    const symbol = buildBattleEmblems[currIcon] || currIcon;
    const colorCode = colorNames[currColorName] || "f";
    const hexColor = mcColorMap[colorCode] || "#FFFFFF";

    diffs.push({
      key: "emblem_combined",
      label: "Emblem",
      oldValue: null,
      newValue: (
        <span style={{ color: hexColor }} title={currColorName}>
          {symbol}
        </span>
      ),
      diff: symbol,
      type: "element",
      isInitial: isInit,
    });
  }

  return diffs;
}

type DailyGroup = {
  date: string;
  snapshots: StatsSnapshot[];
};

type DailySummary = {
  diffs: Record<string, number>;
  latestValues: Record<string, number>;
};

function DailyStatsGroup({
  group,
  history,
  summary,
}: {
  group: DailyGroup;
  history: StatsSnapshot[];
  summary: DailySummary;
}) {
  const [isOpen, setIsOpen] = useState(false);

  // Calculate rates
  const { diffs, latestValues } = summary;
  const winRate = diffs.games_played > 0 ? ((diffs.wins || 0) / diffs.games_played * 100).toFixed(1) : null;
  const cw = diffs.wins_guess_the_build > 0 && diffs.correct_guesses !== undefined
    ? ((diffs.correct_guesses || 0) / diffs.wins_guess_the_build).toFixed(2)
    : null;
  const pw = diffs.wins_speed_builders > 0 && diffs.games_played !== undefined
    ? ((diffs.wins_speed_builders || 0) / (diffs.games_played || 1) * 100).toFixed(1)
    : null;

  // Calculate Lose = games - wins
  const lose = (diffs.games_played || 0) - (diffs.wins || 0);

  // Define display order
  const fieldOrder = ['score', 'wins', 'lose', 'coins', 'correct_guesses', 'wins_guess_the_build', 'wins_speed_builders', 'wins_solo_normal', 'wins_teams_normal', 'wins_solo_pro', 'super_votes', 'total_votes'];

  const labels: Record<string, string> = {
    score: "Score", wins: "Wins", lose: "Lose", coins: "Coins",
    super_votes: "SV", total_votes: "Votes", correct_guesses: "Correct Guess",
    wins_guess_the_build: "GTB", wins_speed_builders: "SPB",
    wins_solo_normal: "Solo", wins_teams_normal: "Teams", wins_solo_pro: "Pro"
  };

  // Build displayDiffs with proper order
  const allDiffs: Record<string, { diff: number; isNegative: boolean }> = {};
  Object.entries(diffs).forEach(([key, diff]) => {
    if (key !== 'games_played' && diff !== 0) {
      allDiffs[key] = { diff, isNegative: false };
    }
  });
  if (lose > 0) {
    allDiffs['lose'] = { diff: lose, isNegative: true };
  }

  const displayDiffs = fieldOrder
    .filter(key => allDiffs[key])
    .map(key => ({ key, label: labels[key] || key, diff: allDiffs[key].diff, isNegative: allDiffs[key].isNegative }));

  return (
    <Card className="overflow-hidden relative">
      <Badge
        variant="secondary"
        className="absolute -left-1 -top-1 rounded-none rounded-br-lg px-2 py-0.5 text-[10px] z-10 shadow-sm border-none bg-muted/80 backdrop-blur-sm transition-opacity group-hover:bg-muted"
      >
        {group.snapshots.length} traces
      </Badge>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-3 py-4 hover:bg-muted/50 transition-colors cursor-pointer select-none">
            <div className="flex items-center gap-3">
              <div className="text-sm font-medium">
                {(() => {
                  const d = new Date(group.date);
                  return `${d.getMonth() + 1}/${d.getDate()}`;
                })()}
              </div>
              {displayDiffs.length > 0 && (
                <div className="hidden sm:flex items-center gap-2 text-xs">
                  {displayDiffs.slice(0, 6).map(({ key, label, diff, isNegative }) => (
                    <span key={key} className="text-muted-foreground">
                      {label} <span className={cn("font-mono", isNegative ? "text-red-500 dark:text-red-400" : "text-green-600 dark:text-green-400")}>{isNegative ? `+${diff}` : formatDiff(diff)}</span>
                    </span>
                  ))}
                  {displayDiffs.length > 6 && (
                    <span className="text-muted-foreground">+{displayDiffs.length - 6}</span>
                  )}
                </div>
              )}
              {winRate && <span className="text-xs text-muted-foreground">WR <span className="font-mono text-foreground">{winRate}%</span></span>}
              {cw && <span className="text-xs text-muted-foreground">C/W <span className="font-mono text-foreground">{cw}</span></span>}
              <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t px-3 py-2 bg-muted/20">
            {/* Latest values row */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs mb-3 pb-2 border-b border-dashed">
              {Object.entries(latestValues).filter(([key, v]) => v > 0 && key !== 'games_played').map(([key, val]) => {
                const labels: Record<string, string> = {
                  score: "Score", wins: "Wins", coins: "Coins",
                  super_votes: "SV", total_votes: "Votes", correct_guesses: "Correct Guess",
                  wins_guess_the_build: "GTB", wins_speed_builders: "SPB",
                  wins_solo_normal: "Solo", wins_teams_normal: "Teams", wins_solo_pro: "Pro"
                };
                return (
                  <span key={key} className="text-muted-foreground">
                    {labels[key] || key}: <span className="font-mono text-foreground">{val.toLocaleString()}</span>
                  </span>
                );
              })}
            </div>

            {/* Traces */}
            <div className="space-y-1.5">
              {group.snapshots.map((snapshot) => {
                const globalIndex = history.findIndex(h => h.id === snapshot.id);
                const prevSnapshot = history[globalIndex + 1];
                const rawDiffs = getDiffs(snapshot.data?.player, prevSnapshot?.data?.player);

                if (rawDiffs.length === 0 && prevSnapshot) return null;

                // Calculate lose for this trace
                const gamesPlayed = rawDiffs.find(d => d.key === 'games_played');
                const winsData = rawDiffs.find(d => d.key === 'wins');
                const traceLose = (gamesPlayed?.diff as number || 0) - (winsData?.diff as number || 0);

                // Build ordered display
                const traceFieldOrder = ['score', 'wins', 'lose', 'coins', 'correct_guesses', 'wins_guess_the_build', 'wins_speed_builders', 'wins_solo_normal', 'wins_teams_normal', 'wins_solo_pro', 'super_votes', 'total_votes'];
                const traceLabels: Record<string, string> = {
                  score: "Score", wins: "Wins", lose: "Lose", coins: "Coins",
                  super_votes: "SV", total_votes: "Votes", correct_guesses: "Correct Guess",
                  wins_guess_the_build: "GTB", wins_speed_builders: "SPB",
                  wins_solo_normal: "Solo", wins_teams_normal: "Teams", wins_solo_pro: "Pro"
                };

                const traceAllDiffs: Record<string, { diff: number | string; isNegative: boolean }> = {};
                rawDiffs.filter(d => d.type === 'number' && !d.isInitial && d.key !== 'games_played').forEach(d => {
                  traceAllDiffs[d.key] = { diff: d.diff, isNegative: false };
                });
                if (traceLose > 0) {
                  traceAllDiffs['lose'] = { diff: traceLose, isNegative: true };
                }

                const orderedTraceDiffs = traceFieldOrder
                  .filter(key => traceAllDiffs[key])
                  .map(key => ({ key, label: traceLabels[key] || key, diff: traceAllDiffs[key].diff, isNegative: traceAllDiffs[key].isNegative }));

                const stringDiffs = rawDiffs.filter(d => d.type === 'string' || d.type === 'element');

                return (
                  <div key={snapshot.id} className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground min-w-[45px]">
                      {new Date(snapshot.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {!prevSnapshot && <Badge variant="outline" className="text-[10px] h-4 px-1">Init</Badge>}
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                      {orderedTraceDiffs.length > 0 ? (
                        orderedTraceDiffs.map(d => (
                          <span key={d.key} className="text-muted-foreground">
                            {d.label} <span className={cn("font-mono", d.isNegative ? "text-red-500 dark:text-red-400" : "text-green-600 dark:text-green-400")}>{d.isNegative ? `+${d.diff}` : formatDiff(d.diff)}</span>
                          </span>
                        ))
                      ) : stringDiffs.map(d => (
                        <span key={d.key} className="text-muted-foreground">
                          {d.label}: <span className="text-foreground">{d.newValue}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

export function StatsTimeline({ history }: { history: StatsSnapshot[] }) {
  if (!history || history.length === 0) return null;

  const groups: DailyGroup[] = [];
  let currentGroup: DailyGroup | null = null;

  history.forEach((snapshot) => {
    const date = new Date(snapshot.created_at).toDateString();
    if (!currentGroup || currentGroup.date !== date) {
      currentGroup = { date, snapshots: [] };
      groups.push(currentGroup);
    }
    currentGroup.snapshots.push(snapshot);
  });

  return (
    <div className="w-full mt-12 pb-8">
      <h3 className="text-lg font-bold mb-4">Session</h3>
      <div className="space-y-3">
        {groups.map((group) => {
          // Calculate daily summary
          const diffs: Record<string, number> = {};
          const latestSnapshot = group.snapshots[0];
          const latestBb = latestSnapshot?.data?.player?.stats?.BuildBattle || {};

          const latestValues: Record<string, number> = {
            score: Number(latestBb.score || 0),
            games_played: Number(latestBb.games_played || 0),
            wins: Number(latestBb.wins || 0),
            coins: Number(latestBb.coins || 0),
            correct_guesses: Number(latestBb.correct_guesses || 0),
            wins_guess_the_build: Number(latestBb.wins_guess_the_build || 0),
            wins_speed_builders: Number(latestBb.wins_speed_builders || 0),
          };

          group.snapshots.forEach((snapshot) => {
            const globalIndex = history.findIndex(h => h.id === snapshot.id);
            const prevSnapshot = history[globalIndex + 1];

            if (prevSnapshot) {
              const snapshotDiffs = getDiffs(snapshot.data?.player, prevSnapshot.data?.player);
              snapshotDiffs.forEach(d => {
                if (d.type === 'number' && !d.isInitial && typeof d.diff === 'number') {
                  diffs[d.key] = (diffs[d.key] || 0) + d.diff;
                }
              });
            }
          });

          return (
            <DailyStatsGroup
              key={group.date}
              group={group}
              history={history}
              summary={{ diffs, latestValues }}
            />
          );
        })}
      </div>
    </div>
  );
}
