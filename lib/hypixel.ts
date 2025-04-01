export interface BuildBattleStats {
  score?: number;
  games_played?: number;
  wins?: number;
  coins?: number;
  total_votes?: number;
  wins_solo_normal?: number;
  solo_most_points?: number;
  wins_teams_normal?: number;
  teams_most_points?: number;
  wins_pro_mode?: number;
  wins_guess_the_build?: number;
  correct_guesses?: number;
  wins_speed_builders?: number;
}

export interface PlayerObjectStats {
  displayname: string;
  userLanguage?: string;
  stats: {
    BuildBattle?: BuildBattleStats;
  };
}

export interface PlayerStats {
  success: boolean;
  player?: PlayerObjectStats;
  error?: string;
}

export async function getPlayerStats(
  username: string,
  apiKey: string,
): Promise<PlayerStats> {
  try {
    // First, get the UUID from the username
    const uuidResponse = await fetch(
      `https://api.mojang.com/users/profiles/minecraft/${username}`,
    );
    if (!uuidResponse.ok) {
      return {
        success: false,
        error: "Player not found",
      };
    }
    const { id: uuid } = await uuidResponse.json();

    // Then, get the player stats from Hypixel
    const response = await fetch(
      `https://api.hypixel.net/v2/status?key=${apiKey}&uuid=${uuid}`,
    );
    if (!response.ok) {
      return {
        success: false,
        error: "Failed to fetch player status",
      };
    }
    const statusData = await response.json();

    if (!statusData.success) {
      return {
        success: false,
        error: statusData.cause || "Failed to fetch player status",
      };
    }

    // Get player data
    const playerResponse = await fetch(
      `https://api.hypixel.net/v2/player?key=${apiKey}&uuid=${uuid}`,
    );
    if (!playerResponse.ok) {
      return {
        success: false,
        error: "Failed to fetch player data",
      };
    }
    const playerData = await playerResponse.json();

    if (!playerData.success) {
      return {
        success: false,
        error: playerData.cause || "Failed to fetch player data",
      };
    }

    return {
      success: true,
      player: {
        displayname: playerData.player.displayname,
        userLanguage: playerData.player.userLanguage,
        stats: playerData.player.stats,
      },
    };
  } catch (error) {
    console.error("Error fetching player stats:", error);
    return {
      success: false,
      error: "Failed to fetch player stats",
    };
  }
}
