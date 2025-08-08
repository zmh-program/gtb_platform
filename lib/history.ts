export interface PlayerHistory {
  uuid: string;
  username: string;
  timestamp: number;
}

const HISTORY_KEY = "player_search_history";
const MAX_HISTORY_ITEMS = 8;

export function getSearchHistory(): PlayerHistory[] {
  if (typeof window === "undefined") return [];

  try {
    const history = localStorage.getItem(HISTORY_KEY);
    return history ? JSON.parse(history) : [];
  } catch {
    return [];
  }
}

export function addToSearchHistory(uuid: string, username: string) {
  if (typeof window === "undefined") return;

  const history = getSearchHistory();

  const existingIndex = history.findIndex((item) => item.uuid === uuid);
  if (existingIndex !== -1) {
    history.splice(existingIndex, 1);
  }

  history.unshift({
    uuid,
    username,
    timestamp: Date.now(),
  });

  if (history.length > MAX_HISTORY_ITEMS) {
    history.splice(MAX_HISTORY_ITEMS);
  }

  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

export function clearSearchHistory() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(HISTORY_KEY);
}

export function removeFromSearchHistory(uuid: string) {
  if (typeof window === "undefined") return;

  const history = getSearchHistory();
  const filteredHistory = history.filter((item) => item.uuid !== uuid);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(filteredHistory));
}
