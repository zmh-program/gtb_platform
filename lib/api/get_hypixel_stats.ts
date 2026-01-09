const HYPIXEL_API_URL = "https://api.hypixel.net/v2/player";

interface HypixelResponse {
  success: boolean;
  player: any;
  cause?: string;
}

interface HypixelStatsResponse {
  data?: any;
  error?: string;
}

async function getHypixelStatsRaw(uuid: string, apiKey: string): Promise<any> {
  const hypixelRes = await fetch(`${HYPIXEL_API_URL}?uuid=${uuid}`, {
    headers: {
      Accept: "application/json",
      "API-Key": apiKey,
    },
  });

  const response = await hypixelRes.text();

  let hypixelData: HypixelResponse;
  try {
    hypixelData = JSON.parse(response) as HypixelResponse;
  } catch (error) {
    throw new Error(
      `Failed to parse Hypixel response: ${error}. Body: ${response}`,
    );
  }

  if (!hypixelData.success) {
    throw new Error(hypixelData.cause || "Failed to fetch Hypixel stats");
  }

  if (!hypixelData.player) {
    throw new Error("Player does not exist or has never joined Hypixel Server");
  }

  return hypixelData;
}

export async function getHypixelStats(
  uuid: string,
  apiKey: string,
): Promise<HypixelStatsResponse> {
  try {
    const data = await getHypixelStatsRaw(uuid, apiKey);
    return { data };
  } catch (error) {
    return {
      error: `[Hypixel API] ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}
