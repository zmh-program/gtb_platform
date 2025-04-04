import { NextResponse } from "next/server";

export const revalidate = 3600;

export async function GET(
  request: Request,
  { params }: { params: { username: string } },
) {
  try {
    const username = params.username;
    const size = "64";
    const type = "head";

    if (!username) {
      return NextResponse.json(
        { error: "Username is required" },
        { status: 400 },
      );
    }

    // First get UUID from username
    const mojangRes = await fetch(
      `https://api.mojang.com/users/profiles/minecraft/${username}`,
      {
        mode: "cors",
        headers: {
          Accept: "application/json",
        },
      },
    );

    if (!mojangRes.ok) {
      if (mojangRes.status === 404) {
        return NextResponse.json(
          { error: "Player not found" },
          { status: 404 },
        );
      }
      return NextResponse.json(
        { error: "Failed to fetch player data" },
        { status: mojangRes.status },
      );
    }

    const mojangData = await mojangRes.json();
    const uuid = mojangData.id;

    // Get avatar URLs based on type
    const urls = {
      head: `https://crafatar.com/avatars/${uuid}?size=${size}&overlay=true`,
      body: `https://crafatar.com/renders/body/${uuid}?size=${size}&overlay=true`,
    };

    return NextResponse.json(
      {
        avatarUrl: urls[type as keyof typeof urls] || urls.head,
        allUrls: urls,
      },
      {
        headers: {
          "Cache-Control":
            "public, max-age=3600, s-maxage=3600, stale-while-revalidate=1800", // vercel cache
          Expires: new Date(Date.now() + 3600 * 1000).toUTCString(), // browser cache
        },
      },
    );
  } catch (error) {
    console.error("Avatar API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
