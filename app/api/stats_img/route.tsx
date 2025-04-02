import { NextResponse } from "next/server";
import { ImageResponse } from "@vercel/og";
import { getPlayerStats } from "@/lib/hypixel";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, apiKey } = body;

    if (!username || !apiKey) {
      return NextResponse.json(
        { error: "Username and API key are required" },
        { status: 400 },
      );
    }

    // Directly fetch stats using the same logic as the stats API
    const statsData = await getPlayerStats(username, apiKey);

    if (!statsData.success || !statsData.player) {
      return NextResponse.json(
        { error: statsData.error || "Failed to fetch stats" },
        { status: 400 },
      );
    }

    const bbStats = statsData.player.stats?.BuildBattle || {};

    // Calculate derived stats
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

    // Create the image response
    return new ImageResponse(
      (
        <div
          style={{
            background: "black",
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            color: "white",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          <div style={{ maxWidth: "800px", width: "100%" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
              <h1 style={{ fontSize: "24px", margin: 0 }}>{statsData.player.displayname}</h1>
              {mainMode && (
                <span style={{ fontSize: "14px", padding: "4px 8px", background: "rgba(255,255,255,0.1)", borderRadius: "4px" }}>
                  {mainMode} MAIN
                </span>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              <div style={{ background: "rgba(255,255,255,0.05)", padding: "20px", borderRadius: "8px" }}>
                <h2 style={{ fontSize: "18px", marginBottom: "16px" }}>General Stats</h2>
                <div style={{ display: "grid", gap: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Total Score</span>
                    <span>{bbStats.score?.toLocaleString() || 0}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Language</span>
                    <span>{statsData.player.userLanguage || "N/A"}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Total Games</span>
                    <span>{bbStats.games_played?.toLocaleString() || 0}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Total Wins</span>
                    <span>{bbStats.wins?.toLocaleString() || 0}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Win Rate</span>
                    <span>{winPercentage}%</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Average Score</span>
                    <span>{averagePoint}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Coins</span>
                    <span>{bbStats.coins?.toLocaleString() || 0}</span>
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gap: "20px" }}>
                <div style={{ background: "rgba(255,255,255,0.05)", padding: "20px", borderRadius: "8px" }}>
                  <h2 style={{ fontSize: "18px", marginBottom: "16px" }}>Build Battle</h2>
                  <div style={{ display: "grid", gap: "8px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Total Votes</span>
                      <span>{bbStats.total_votes?.toLocaleString() || 0}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Solo Wins</span>
                      <span>{bbStats.wins_solo_normal || 0}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Team Wins</span>
                      <span>{bbStats.wins_teams_normal || 0}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Pro Wins</span>
                      <span>{bbStats.wins_pro_mode || 0}</span>
                    </div>
                  </div>
                </div>

                <div style={{ background: "rgba(255,255,255,0.05)", padding: "20px", borderRadius: "8px" }}>
                  <h2 style={{ fontSize: "18px", marginBottom: "16px" }}>Guess The Build</h2>
                  <div style={{ display: "grid", gap: "8px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Wins</span>
                      <span>{bbStats.wins_guess_the_build || 0}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Correct Guesses</span>
                      <span>{bbStats.correct_guesses?.toLocaleString() || 0}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>C/W</span>
                      <span>{cwValue}</span>
                    </div>
                  </div>
                </div>

                <div style={{ background: "rgba(255,255,255,0.05)", padding: "20px", borderRadius: "8px" }}>
                  <h2 style={{ fontSize: "18px", marginBottom: "16px" }}>Speed Builders</h2>
                  <div style={{ display: "grid", gap: "8px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Wins</span>
                      <span>{bbStats.wins_speed_builders || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
      {
        width: 800,
        height: 600,
        headers: {
          "Cache-Control": "public, max-age=3600",
        },
      }
    );
  } catch (error) {
    console.error("Error generating stats image:", error);
    return NextResponse.json(
      { error: "Failed to generate stats image" },
      { status: 500 },
    );
  }
}
