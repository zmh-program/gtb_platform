/**
 * Generate Crafatar URLs for Minecraft player avatars
 */

export interface AvatarUrls {
  head: string;
  body: string;
}

/**
 * Generate avatar URLs for a given UUID
 * @param uuid - Player's UUID (with or without dashes)
 * @param size - Size of the avatar (default: 64)
 * @returns Object containing head and body avatar URLs
 */
export function generateAvatarUrls(uuid: string, size: string = "64"): AvatarUrls {
  // Remove dashes from UUID if present
  const cleanUuid = uuid.replace(/-/g, "");
  
  return {
    head: `https://crafatar.com/avatars/${cleanUuid}?size=${size}&overlay=true`,
    body: `https://nmsr.nickac.dev/fullbody/${cleanUuid}`,
  };
}

/**
 * Get a single avatar URL
 * @param uuid - Player's UUID
 * @param type - Type of avatar ('head' or 'body')
 * @param size - Size of the avatar (default: 64)
 * @returns Avatar URL
 */
export function getAvatarUrl(uuid: string, type: 'head' | 'body' = 'head', size: string = "64"): string {
  const urls = generateAvatarUrls(uuid, size);
  return urls[type];
}
