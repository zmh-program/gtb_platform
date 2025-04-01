import { Card } from "@/components/ui/card";
import { PlayerObjectStats } from "@/lib/hypixel";

export function StatsDisplay({
  stats,
  displayname,
  userLanguage,
}: PlayerObjectStats) {
  const bbStats = stats?.BuildBattle || {};

  const winPercentage =
    bbStats.games_played && bbStats.games_played > 0 && bbStats.wins
      ? ((bbStats.wins / bbStats.games_played) * 100).toFixed(2)
      : 0;

  const averagePoint =
    bbStats.score && bbStats.games_played && bbStats.games_played > 0
      ? (bbStats.score / bbStats.games_played).toFixed(2)
      : 0;

  const cwValue =
    bbStats.correct_guesses &&
    bbStats.wins_guess_the_build &&
    bbStats.wins_guess_the_build > 0
      ? (bbStats.correct_guesses / bbStats.wins_guess_the_build).toFixed(2)
      : 0;

  const bbTotalWins =
    (bbStats.wins_solo_normal || 0) +
    (bbStats.wins_teams_normal || 0) +
    (bbStats.wins_pro_mode || 0);
  const gtbTotalWins = bbStats.wins_guess_the_build || 0;
  const spbTotalWins = bbStats.wins_speed_builders || 0;

  const mainMode = (() => {
    const modes = [
      { name: "BB", wins: bbTotalWins },
      { name: "GTB", wins: gtbTotalWins },
      { name: "SPB", wins: spbTotalWins },
    ];
    const topMode = modes.reduce((prev, current) =>
      prev.wins > current.wins ? prev : current,
    );
    return topMode.wins > 0 ? topMode.name : null;
  })();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold">{displayname}</h2>
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
              <span>{userLanguage || "N/A"}</span>
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
