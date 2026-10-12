// Everything the game stores sits under one prefix; a debug session keeps its own copy of it under
// a longer one, so nothing tested there ever reaches a real run's archive or settings.
const GAME_PREFIX = "newspeak1984.";
const SANDBOX_PREFIX = "newspeak1984.debug.";

export type ResetScope = "debug" | "all";

// Where a debug session keeps what the game asks for under `key`.
export function sandboxKey(key: string): string {
  return key.startsWith(GAME_PREFIX)
    ? SANDBOX_PREFIX + key.slice(GAME_PREFIX.length)
    : key;
}

// From here on, the game reads and writes the sandbox whenever it touches `localStorage`.
export function sandboxStorage(): void {
  const real = window.localStorage;
  const sandbox: Pick<Storage, "getItem" | "setItem" | "removeItem"> = {
    getItem: (key) => real.getItem(sandboxKey(key)),
    setItem: (key, value) => real.setItem(sandboxKey(key), value),
    removeItem: (key) => real.removeItem(sandboxKey(key)),
  };

  Object.defineProperty(window, "localStorage", {
    value: sandbox,
    configurable: true,
  });
}

// `debug` empties the sandbox; `all` erases everything the game has stored, real runs and settings
// included, as a first visit would find it. Called before the sandbox takes over.
export function resetStorage(scope: ResetScope): void {
  const prefix = scope === "all" ? GAME_PREFIX : SANDBOX_PREFIX;
  try {
    const keys = Array.from({ length: localStorage.length }, (_, i) =>
      localStorage.key(i),
    );
    for (const key of keys)
      if (key?.startsWith(prefix)) localStorage.removeItem(key);
  } catch {
    // Blocked storage holds nothing to reset.
  }
}
