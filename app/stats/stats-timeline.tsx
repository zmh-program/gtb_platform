"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUp, Clock, History } from "lucide-react";

type StatsSnapshot = {
    created_at: string;
    data: any;
};

type Diff = {
    key: string;
    label: string;
    oldValue: any;
    newValue: any;
    diff: number | string;
    type: "number" | "string";
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

        // If previous exists, only show changes.
        // If previous doesn't exist, show all non-zero values as initial state.
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

export function StatsTimeline({ history }: { history: StatsSnapshot[] }) {
    if (!history || history.length === 0) return null;

    return (
        <div className="space-y-4 mt-12">
            <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-muted-foreground" />
                <h3 className="text-lg font-bold">Session</h3>
            </div>

            <div className="relative border-l-2 border-muted ml-3 space-y-8 pb-4">
                {history.map((snapshot, index) => {
                    // Compare with the NEXT item in the list (which is older)
                    // If it's the last item, compare with null (so we get initial stats)
                    const prevSnapshot = history[index + 1];
                    const diffs = getDiffs(
                        snapshot.data?.player,
                        prevSnapshot?.data?.player
                    );

                    if (diffs.length === 0 && index !== history.length - 1) {
                        // Skip entries with no changes unless it's the very first entry ever logged
                        // (Though now that initial entries have content, this check is mostly for middle entries with 0 diffs)
                        return null;
                    }

                    return (
                        <div key={index} className="relative pl-8">
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
                                                {/* Only show green diff arrow if it's NOT the initial state */}
                                                {diff.type === "number" && !diff.isInitial && (
                                                    <span className="text-green-500 text-xs flex items-center">
                                                        <ArrowUp className="h-3 w-3 mr-0.5" />
                                                        {formatDiff(diff.diff)}
                                                    </span>
                                                )}
                                                {/* Only show (New) if it's NOT the initial state */}
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
    );
}
