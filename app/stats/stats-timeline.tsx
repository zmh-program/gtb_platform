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
  CornerDownRight,
} from "lucide-react";
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

  const currEmblem = currBb.emblem || {};
  const prevEmblem = prevBb.emblem || {};

  const currIcon = currEmblem.selected_icon;
  const prevIcon = prevEmblem.selected_icon;
  const currColorName = currEmblem.selected_color;
  const prevColorName = prevEmblem.selected_color;

  let showEmblem = false;
  let isInit = false;

  if (previous) {
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
};

function DailyStatsGroup({
  group,
  history,
  dailyDiffs,
  isLast
}: {
  group: DailyGroup,
  history: StatsSnapshot[],
  dailyDiffs: Diff[],
  isLast: boolean
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="group relative pl-8 pb-8 last:pb-0"
    >
      {/* Timeline Line: A continuous line that stops for the last item */}
      {!isLast && (
        <div className="absolute left-[11px] top-6 bottom-0 w-px bg-border group-last:hidden" />
      )}

      {/* Timeline Dot */}
      <div className={cn(
        "absolute left-0 top-3 h-[22px] w-[22px] rounded-full border-4 border-background transition-colors duration-200 z-10 box-border shadow-sm",
        isOpen ? "bg-primary" : "bg-muted-foreground/30"
      )} />

      <CollapsibleTrigger asChild>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-md hover:bg-muted/50 transition-all cursor-pointer select-none">
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <div className="font-semibold text-sm">
                {new Date(group.date).toLocaleDateString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric'
                })}
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                <span>{group.snapshots.length} traces</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 mt-2 sm:mt-0">
            {dailyDiffs.filter(d => !d.isInitial).length > 0 && (
              <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1 max-w-xl text-xs">
                {dailyDiffs.filter(d => !d.isInitial).map((diff) => (
                  <div key={diff.key} className="flex items-center gap-1.5 text-muted-foreground">
                    <span>{diff.label}</span>
                    <span className={cn(
                      "font-mono font-medium",
                      diff.type === 'number' ? 'text-green-600 dark:text-green-400' : 'text-foreground'
                    )}>
                      {diff.type === "number"
                        ? `+${typeof diff.diff === 'number' ? diff.diff.toLocaleString() : diff.diff}`
                        : diff.newValue}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <ChevronDown className={cn(
              "h-4 w-4 text-muted-foreground transition-transform duration-200",
              isOpen && "rotate-180"
            )} />
          </div>
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="space-y-3 mt-3 pl-2">
          {group.snapshots.map((snapshot) => {
            const globalIndex = history.findIndex(h => h.id === snapshot.id);
            const prevSnapshot = history[globalIndex + 1];

            const diffs = getDiffs(
              snapshot.data?.player,
              prevSnapshot?.data?.player
            );

            if (diffs.length === 0 && prevSnapshot) return null;

            return (
              <div key={snapshot.id} className="flex items-start gap-3 text-sm">
                <span className="text-muted-foreground text-xs min-w-[52px] pt-0.5">
                  {new Date(snapshot.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>

                <div className="flex-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                  {!prevSnapshot && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Initial</span>
                  )}
                  {diffs.length > 0 ? (
                    diffs.map((diff, i) => (
                      <span key={diff.key} className="flex items-center gap-1">
                        <span className="text-muted-foreground">{diff.label}</span>
                        <span className="font-mono text-foreground">
                          {diff.type === "number" ? diff.newValue.toLocaleString() : diff.newValue}
                        </span>
                        {diff.type === "number" && !diff.isInitial && (
                          <span className="text-green-600 dark:text-green-400 text-xs">
                            {formatDiff(diff.diff)}
                          </span>
                        )}
                      </span>
                    ))
                  ) : (
                    <span className="text-muted-foreground/50 italic text-xs">No changes</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function StatsTimeline({ history }: { history: StatsSnapshot[] }) {
  if (!history || history.length === 0) return null;

  const groups: DailyGroup[] = [];
  let currentGroup: DailyGroup | null = null;

  history.forEach((snapshot) => {
    const date = new Date(snapshot.created_at).toDateString();
    if (!currentGroup || currentGroup.date !== date) {
      currentGroup = {
        date,
        snapshots: [],
      };
      groups.push(currentGroup);
    }
    currentGroup.snapshots.push(snapshot);
  });

  return (
    <div className="w-full mt-12 pb-12">
      <div className="flex items-center gap-3 mb-2">
        <h3 className="text-lg font-bold">Session</h3>
      </div>

      <div className="space-y-0">
        {groups.map((group, idx) => {
          // Calculate daily summary by summing all individual diffs within the day
          const dailySummary: Record<string, { label: string; diff: number; type: 'number' | 'string' | 'element'; newValue: any }> = {};

          group.snapshots.forEach((snapshot) => {
            const globalIndex = history.findIndex(h => h.id === snapshot.id);
            const prevSnapshot = history[globalIndex + 1];

            if (prevSnapshot) {
              const diffs = getDiffs(snapshot.data?.player, prevSnapshot.data?.player);
              diffs.forEach(d => {
                if (d.type === 'number' && !d.isInitial && typeof d.diff === 'number') {
                  if (!dailySummary[d.key]) {
                    dailySummary[d.key] = { label: d.label, diff: 0, type: 'number', newValue: d.newValue };
                  }
                  dailySummary[d.key].diff += d.diff;
                  dailySummary[d.key].newValue = d.newValue; // Keep latest value
                }
              });
            }
          });

          // Convert to array format for dailyDiffs
          const dailyDiffs: Diff[] = Object.entries(dailySummary)
            .filter(([_, v]) => v.diff !== 0)
            .map(([key, v]) => ({
              key,
              label: v.label,
              oldValue: 0,
              newValue: v.newValue,
              diff: v.diff,
              type: v.type,
              isInitial: false
            }));

          return (
            <DailyStatsGroup
              key={group.date}
              group={group}
              history={history}
              dailyDiffs={dailyDiffs}
              isLast={idx === groups.length - 1}
            />
          );
        })}
      </div>
    </div>
  );
}
