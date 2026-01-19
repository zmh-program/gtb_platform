"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ArrowUp,
  Clock,
  History,
  ChevronRight,
  ChevronDown,
  Calendar,
} from "lucide-react";
import { useState } from "react";

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
  return diff?.toString();
}

function getDiffs(current: any, previous: any): Diff[] {
  const diffs: Diff[] = [];
  const currBb = current?.stats?.BuildBattle || {};
  const prevBb = previous?.stats?.BuildBattle || {};

  const numericFields = [
    { key: "score", label: "Score" },
    { key: "games_played", label: "Games Played" },
    { key: "wins", label: "Wins" },
    { key: "coins", label: "Coins" },
    { key: "super_votes", label: "Super Votes" },
    { key: "total_votes", label: "Total Votes" },
    { key: "correct_guesses", label: "Correct Guesses" },
    { key: "wins_guess_the_build", label: "GTB Wins" },
    { key: "wins_speed_builders", label: "SPB Wins" },
    { key: "wins_solo_normal", label: "Solo Wins" },
    { key: "wins_teams_normal", label: "Team Wins" },
    { key: "wins_solo_pro", label: "Pro Wins" },
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
    { key: "new_victory_dance", label: "Victory Dance" },
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

  // Emblem Logic
  const currEmblem = currBb.emblem || {};
  const prevEmblem = prevBb.emblem || {};

  const currIcon = currEmblem.selected_icon;
  const prevIcon = prevEmblem.selected_icon;
  const currColorName = currEmblem.selected_color;
  const prevColorName = prevEmblem.selected_color;

  // Determine if we should show emblem
  let showEmblem = false;
  let isInit = false;

  if (previous) {
    // Show if either icon or color changed
    if (
      (currIcon !== prevIcon || currColorName !== prevColorName) &&
      currIcon
    ) {
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

function formatTimeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return `${Math.max(0, diffInSeconds)}s ago`;
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}min ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}day ago`;
}

type DailyGroup = {
  date: string;
  snapshots: StatsSnapshot[];
  summary: {
    score: number;
    wins: number;
    games: number;
  };
};

function DailyStatsGroup({ group, history }: { group: DailyGroup, history: StatsSnapshot[] }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="border rounded-md bg-background/50 overflow-hidden"
    >
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-primary/10 rounded-full">
              <Calendar className="h-4 w-4 text-primary" />
            </div>
            <div>
              <div className="font-semibold text-sm">
                {new Date(group.date).toLocaleDateString(undefined, {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {group.snapshots.length} updates
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {(group.summary.score > 0 || group.summary.wins > 0) && (
              <div className="hidden sm:flex items-center gap-3 text-sm">
                {group.summary.score > 0 && (
                  <Badge variant="outline" className="text-green-600 bg-green-500/10 border-green-500/20">
                    Score +{group.summary.score.toLocaleString()}
                  </Badge>
                )}
                {group.summary.wins > 0 && (
                  <Badge variant="outline" className="text-blue-600 bg-blue-500/10 border-blue-500/20">
                    Wins +{group.summary.wins.toLocaleString()}
                  </Badge>
                )}
              </div>
            )}
            {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </div>
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="p-4 pt-0 space-y-8 mt-4 border-t border-muted/50 pt-6">
          <div className="relative border-l-2 border-muted ml-3 space-y-8 pb-2">
            {group.snapshots.map((snapshot) => {
              // Find this snapshot's index in the FULL history to get the global context
              // We need global context because "previous" might be in the next day's group
              const globalIndex = history.findIndex(h => h.id === snapshot.id);
              const prevSnapshot = history[globalIndex + 1];

              const diffs = getDiffs(
                snapshot.data?.player,
                prevSnapshot?.data?.player
              );

              if (diffs.length === 0 && prevSnapshot) return null;

              return (
                <div key={snapshot.id} className="relative pl-8">
                  <div className="absolute -left-[9px] top-1 h-4 w-4 rounded-full bg-background border-2 border-primary" />
                  <div className="flex flex-col gap-2">
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      <span className="font-medium text-foreground">
                        {formatTimeAgo(snapshot.created_at)}
                      </span>
                      <span className="text-xs">
                        ({new Date(snapshot.created_at).toLocaleTimeString()})
                      </span>
                      {!prevSnapshot && (
                        <span className="text-xs bg-muted px-2 py-0.5 rounded">
                          Initial
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {diffs.length > 0 ? (
                        diffs.map((diff) => (
                          <Badge
                            key={diff.key}
                            variant="secondary"
                            className="text-sm py-1 px-3 flex items-center gap-2"
                          >
                            <span className="text-muted-foreground font-normal">
                              {diff.label}
                            </span>
                            <span className="font-mono font-bold">
                              {diff.type === "number"
                                ? diff.newValue.toLocaleString()
                                : diff.newValue}
                            </span>
                            {diff.type === "number" && !diff.isInitial && (
                              <span className="text-green-500 text-xs flex items-center">
                                <ArrowUp className="h-3 w-3 mr-0.5" />
                                {formatDiff(diff.diff)}
                              </span>
                            )}
                            {diff.type === "string" && !diff.isInitial && (
                              <span className="text-muted-foreground text-xs italic">
                                (New)
                              </span>
                            )}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground italic">
                          No changes recorded.
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function StatsTimeline({ history }: { history: StatsSnapshot[] }) {
  if (!history || history.length === 0) return null;

  // Group history by day
  const groups: DailyGroup[] = [];
  let currentGroup: DailyGroup | null = null;

  history.forEach((snapshot, index) => {
    const date = new Date(snapshot.created_at).toDateString(); // "Mon Jan 01 2024"

    // Ensure new group if date changes
    if (!currentGroup || currentGroup.date !== date) {
      currentGroup = {
        date,
        snapshots: [],
        summary: { score: 0, wins: 0, games: 0 }
      };
      groups.push(currentGroup);
    }

    currentGroup.snapshots.push(snapshot);

    // Calculate diff for summary
    const prevSnapshot = history[index + 1];
    if (prevSnapshot) {
      const diffs = getDiffs(snapshot.data?.player, prevSnapshot.data?.player);
      diffs.forEach(d => {
        if (d.type === "number" && typeof d.diff === 'number' && !d.isInitial) {
          if (d.key === "score") currentGroup!.summary.score += d.diff;
          if (d.key === "wins") currentGroup!.summary.wins += d.diff;
          if (d.key === "games_played") currentGroup!.summary.games += d.diff;
        }
      });
    }
  });

  return (
    <div className="space-y-4 mt-16 w-full">
      <div className="flex items-center gap-2 mb-4">
        <History className="h-5 w-5 text-muted-foreground" />
        <h3 className="text-lg font-bold">Session</h3>
      </div>

      <div className="space-y-4">
        {groups.map((group) => (
          <DailyStatsGroup key={group.date} group={group} history={history} />
        ))}
      </div>
    </div>
  );
}
