import { createAdminClient } from "@/utils/supabase/admin";
import { NextResponse } from "next/server";
import { getUUIDFromPlayer } from "@/lib/api/get_uuid_from_player";
import { getHypixelStats } from "@/lib/api/get_hypixel_stats";

export const dynamic = "force-dynamic";
export const revalidate = 120;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username");
    const api_key = searchParams.get("api_key");

    if (!username) {
      return NextResponse.json(
        { error: "Username is required" },
        { status: 400 },
      );
    }

    const apiKey = api_key?.trim() || process.env.HYPIXEL_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Hypixel API key is required" },
        { status: 400 },
      );
    }

    // Get UUID from username
    const uuidResponse = await getUUIDFromPlayer(username);
    if (uuidResponse.error) {
      return NextResponse.json(
        { error: uuidResponse.error },
        { status: uuidResponse.error.includes("404") ? 404 : 500 },
      );
    }

    // Get Hypixel stats using UUID
    const statsResponse = await getHypixelStats(uuidResponse.id, apiKey);
    if (statsResponse.error) {
      return NextResponse.json(
        { error: statsResponse.error },
        { status: statsResponse.error.includes("404") ? 404 : 500 },
      );
    }

    const stats = statsResponse.data?.player || {};
    const bbStats = stats.stats?.BuildBattle || {};

    const filteredData = {
      player: {
        uuid: stats.uuid,
        displayname: stats.displayname,
        rank: stats.rank,
        packageRank: stats.packageRank,
        newPackageRank: stats.newPackageRank,
        monthlyPackageRank: stats.monthlyPackageRank,
        rankPlusColor: stats.rankPlusColor,
        monthlyRankColor: stats.monthlyRankColor,
        prefix: stats.prefix,
        userLanguage: stats.userLanguage,
        achievements: {
          buildbattle_speed_builders_perfectionist:
            stats.achievements?.buildbattle_speed_builders_perfectionist,
        },
        stats: {
          BuildBattle: {
            score: bbStats.score,
            games_played: bbStats.games_played,
            wins: bbStats.wins,
            coins: bbStats.coins,
            total_votes: bbStats.total_votes,
            super_votes: bbStats.super_votes,
            wins_solo_normal: bbStats.wins_solo_normal,
            solo_most_points: bbStats.solo_most_points,
            wins_teams_normal: bbStats.wins_teams_normal,
            teams_most_points: bbStats.teams_most_points,
            wins_solo_pro: bbStats.wins_solo_pro,
            wins_guess_the_build: bbStats.wins_guess_the_build,
            correct_guesses: bbStats.correct_guesses,
            wins_speed_builders: bbStats.wins_speed_builders,
            new_selected_hat: bbStats.new_selected_hat,
            active_movement_trail: bbStats.active_movement_trail,
            selected_backdrop: bbStats.selected_backdrop,
            new_suit: bbStats.new_suit,
            new_victory_dance: bbStats.new_victory_dance,
            buildbattle_loadout: bbStats.buildbattle_loadout,
            last_won: bbStats.last_won,
            emblem: {
              selected_color: bbStats.emblem?.selected_color,
              selected_icon: bbStats.emblem?.selected_icon,
            },
          },
        },
      },
    };

    try {
      const supabase = createAdminClient();
      const { error: dbError } = await supabase.from("gtb").insert({
        uuid: uuidResponse.id,
        data: filteredData,
        created_at: new Date().toISOString(),
      });

      if (dbError) {
        console.error("Supabase insert error:", dbError);
      }
    } catch (err) {
      console.error("Supabase client error:", err);
    }

    return NextResponse.json(
      {
        ...statsResponse.data,
        lastUpdated: Math.floor(Date.now() / 1000),
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=120, stale-while-revalidate=60",
        },
      },
    );
  } catch (error) {
    console.error("Stats API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
