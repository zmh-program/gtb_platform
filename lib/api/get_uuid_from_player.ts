const ASHCON_API_URL = "https://api.ashcon.app/mojang/v2/user";
const MOJANG_API_URL = "https://api.mojang.com/users/profiles/minecraft";
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UUID_REGEX_NATIVE = /^[0-9a-f]{32}$/i;

interface AshconResponse {
  uuid: string;
  username: string;
  username_history: Array<{ username: string; changed_at?: string }>;
  textures: {
    skin: { url: string };
    cape?: { url: string };
  };
  created_at: string;
  raw_id: string;
}

interface MojangResponse {
  id: string;
  name: string;
  errorMessage?: string;
}

interface UUIDResponse {
  id: string;
  error?: string;
}

function formatUUID(uuid: string): string {
  return `${uuid.slice(0, 8)}-${uuid.slice(8, 12)}-${uuid.slice(12, 16)}-${uuid.slice(16, 20)}-${uuid.slice(20)}`;
}

async function getAshconUUID(username: string): Promise<string> {
  try {
    const response = await fetch(`${ASHCON_API_URL}/${username}`);
    if (!response.ok) {
      throw new Error(`Ashcon API returned ${response.status}`);
    }

    const data: AshconResponse = await response.json();
    return formatUUID(data.uuid);
  } catch (error) {
    console.warn(
      `Ashcon API failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
    throw error; // Propagate error to try Mojang API
  }
}

async function getMojangUUID(username: string): Promise<string> {
  const mojangRes = await fetch(`${MOJANG_API_URL}/${username}`, {
    headers: { Accept: "application/json" },
  });

  let mojangData: MojangResponse;
  const responseText = await mojangRes.text();
  try {
    mojangData = JSON.parse(responseText);
  } catch (error) {
    throw new Error(
      `Failed to parse Mojang API response: ${error instanceof Error ? error.message : "Unknown error"}. Response: ${responseText}`,
    );
  }

  if (mojangData.errorMessage) {
    // include  Couldn't find any profile with name
    if (
      mojangData.errorMessage.includes("Couldn't find any profile with name")
    ) {
      throw new Error(`Player does not exist: ${username}`);
    }

    throw new Error("Mojang API Error: " + mojangData.errorMessage);
  }

  if (!mojangData?.id) {
    throw new Error(
      "Invalid response from Mojang API: " + JSON.stringify(mojangData),
    );
  }

  return formatUUID(mojangData.id);
}

async function getUUIDFromPlayerRaw(username: string): Promise<string> {
  if (UUID_REGEX_NATIVE.test(username)) {
    return formatUUID(username);
  }

  if (UUID_REGEX.test(username)) {
    return username;
  }

  try {
    // Try Ashcon API first
    return await getAshconUUID(username);
  } catch (error) {
    // If Ashcon fails, fallback to Mojang API
    return await getMojangUUID(username);
  }
}

export async function getUUIDFromPlayer(
  username: string,
): Promise<UUIDResponse> {
  try {
    const uuid = await getUUIDFromPlayerRaw(username);
    return { id: uuid };
  } catch (error) {
    return {
      id: "",
      error: `[Mojang API] ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}
