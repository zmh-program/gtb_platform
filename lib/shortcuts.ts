function parseShortcuts(rawShortcuts: string) {
  return Object.fromEntries(
    rawShortcuts
      .toLowerCase()
      .split("\n")
      .filter(
        (line) => line.trim() && !line.startsWith("#") && line.includes("="),
      )
      .map((line) => {
        const segments = line.split("=").map((s) => s.trim());
        if (segments.length !== 2) return [null, null];

        const [key, values] = segments;
        return [
          key,
          values
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean),
        ];
      })
      .filter(([key, _]) => key !== null),
  );
}

export function saveLocalShortcut(shortcuts: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("custom_shortcuts", shortcuts);
}

export function getRawLocalShortcuts(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem("custom_shortcuts") || "";
}

function getLocalShortcuts() {
  const customShortcuts = getRawLocalShortcuts();
  if (!customShortcuts) return {};

  return parseShortcuts(customShortcuts);
}

export function getShortcut(shortcut: string): string[] | undefined {
  shortcut = shortcut.toLowerCase().trim();
  const localShortcuts = getLocalShortcuts();

  return localShortcuts[shortcut];
}
