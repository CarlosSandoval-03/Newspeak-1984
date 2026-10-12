import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readHonorRoll, recordRun } from "../systems/HonorRoll";
import { resetStorage, sandboxKey, sandboxStorage } from "./sandbox";

// Enough of the browser's Storage for the sandbox and the game.
function memoryStorage(entries: Record<string, string>) {
  const items = new Map(Object.entries(entries));
  return {
    items,
    get length() {
      return items.size;
    },
    key: (i: number) => [...items.keys()][i] ?? null,
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => items.set(key, value),
    removeItem: (key: string) => items.delete(key),
  };
}

describe("sandboxKey", () => {
  it("moves the game's keys under the debug prefix, and leaves others alone", () => {
    expect(sandboxKey("newspeak1984.scores")).toBe("newspeak1984.debug.scores");
    expect(sandboxKey("other.app")).toBe("other.app");
  });
});

describe("the debug sandbox", () => {
  const run = { pilotId: "6079", score: 4210, unperson: false };
  let real: ReturnType<typeof memoryStorage>;

  beforeEach(() => {
    real = memoryStorage({
      "newspeak1984.scores": JSON.stringify([run]),
      "newspeak1984.lang": "es",
      "newspeak1984.debug.scores": "[]",
      "newspeak1984.debug.tools": "{}",
      "other.app": "kept",
    });
    vi.stubGlobal("window", globalThis);
    vi.stubGlobal("localStorage", real);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps what a debug session stores apart from the real runs", () => {
    sandboxStorage();

    expect(readHonorRoll()).toEqual([]);
    recordRun({ pilotId: "0001", score: 99000, unperson: false });

    expect(JSON.parse(real.items.get("newspeak1984.scores")!)).toEqual([run]);
    expect(
      JSON.parse(real.items.get("newspeak1984.debug.scores")!),
    ).toHaveLength(1);
  });

  it("empties the sandbox only, or everything the game stored", () => {
    resetStorage("debug");
    expect([...real.items.keys()]).toEqual([
      "newspeak1984.scores",
      "newspeak1984.lang",
      "other.app",
    ]);

    resetStorage("all");
    expect([...real.items.keys()]).toEqual(["other.app"]);
  });
});
