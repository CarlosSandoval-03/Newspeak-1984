import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  HONOR_ROLL_SIZE,
  SCORE_ALTER_CHANCE,
  SCORE_ALTER_MAX,
  SCORE_ALTER_MIN,
  SCORE_ERASE_CHANCE,
} from "../config";
import {
  recordRun,
  type HonorRollEntry,
  readHonorRoll,
  tampered,
  tamperHonorRoll,
  withRun,
} from "./HonorRoll";

const KEY = "newspeak1984.scores";
const pilot = (pilotId: string, score: number): HonorRollEntry => ({
  pilotId,
  score,
  unperson: false,
});
// Hands out the given draws in order, as Math.random would.
const draws = (...values: number[]) => {
  let i = 0;
  return () => values[i++];
};

describe("the honor roll in storage", () => {
  let saved: Map<string, string>;

  beforeEach(() => {
    saved = new Map();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => saved.get(key) ?? null,
      setItem: (key: string, value: string) => saved.set(key, value),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts empty", () => {
    expect(readHonorRoll()).toEqual([]);
  });

  it("keeps only the best runs, highest first, as data", () => {
    for (let i = 0; i <= HONOR_ROLL_SIZE; i++)
      recordRun(pilot(String(i).padStart(4, "0"), i * 100));

    const roll = readHonorRoll();
    expect(roll).toHaveLength(HONOR_ROLL_SIZE);
    expect(roll[0]).toEqual(pilot("0010", 1000));
    expect(roll.at(-1)).toEqual(pilot("0001", 100));
    expect(JSON.parse(saved.get(KEY)!)).toEqual(roll);
  });

  it("starts over from a damaged archive", () => {
    saved.set(KEY, JSON.stringify([{ pilotId: 6079, score: "a lot" }]));
    expect(readHonorRoll()).toEqual([]);

    saved.set(KEY, JSON.stringify({ pilotId: "6079" }));
    expect(readHonorRoll()).toEqual([]);

    saved.set(KEY, "{ not json");
    expect(readHonorRoll()).toEqual([]);
  });

  it("is tampered with as it stood, row for row, and saved reordered", () => {
    recordRun(pilot("0001", 2000));
    recordRun(pilot("0002", 1000));

    // The first is erased; the second is altered to the top of its range.
    const { before, after } = tamperHonorRoll(draws(0, 1, 0, 1));

    expect(before).toEqual([pilot("0001", 2000), pilot("0002", 1000)]);
    expect(after).toEqual([
      { pilotId: "0001", score: 0, unperson: true },
      pilot("0002", 1000 * SCORE_ALTER_MAX),
    ]);
    expect(readHonorRoll()).toEqual([after[1], after[0]]);
  });
});

describe("the honor roll without storage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lasts the session in memory, and the game goes on", () => {
    const blocked = () => {
      throw new Error("SecurityError");
    };
    vi.stubGlobal("localStorage", { getItem: blocked, setItem: blocked });

    expect(() => recordRun(pilot("1984", 4210))).not.toThrow();
    expect(readHonorRoll()).toContainEqual(pilot("1984", 4210));
  });
});

describe("tampered", () => {
  const roll = [pilot("0001", 1000), pilot("0002", 1000)];

  it("erases an entry into an unperson when the draw falls under the erase chance", () => {
    expect(tampered(roll, draws(SCORE_ERASE_CHANCE / 2, 0.99, 0.99))).toEqual([
      { pilotId: "0001", score: 0, unperson: true },
      roll[1],
    ]);
  });

  it("otherwise scales a score within its range when the draw falls under the alter chance", () => {
    const [low] = tampered(roll, draws(0.99, 0, 0, 0.99, 0.99));
    const [high] = tampered(roll, draws(0.99, SCORE_ALTER_CHANCE / 2, 1));

    expect(low.score).toBe(1000 * SCORE_ALTER_MIN);
    expect(high.score).toBe(1000 * SCORE_ALTER_MAX);
  });

  it("leaves an unperson as it is", () => {
    const unperson = { pilotId: "0003", score: 0, unperson: true };
    expect(tampered([unperson], draws(0, 0, 0))).toEqual([unperson]);
  });
});

describe("withRun", () => {
  const archive = {
    before: [pilot("0001", 3000), pilot("0002", 1000)],
    after: [pilot("0001", 4500), { pilotId: "0002", score: 0, unperson: true }],
  };

  it("shows the run being flown at its place, on the same row before and after", () => {
    const run = pilot("6079", 2000);

    expect(withRun(archive, run)).toEqual({
      before: [archive.before[0], run, archive.before[1]],
      after: [archive.after[0], run, archive.after[1]],
    });
  });

  it("leaves the run off a full table it doesn't place on", () => {
    const full = Array.from({ length: HONOR_ROLL_SIZE }, (_, i) =>
      pilot(String(i), 1000),
    );
    const { before } = withRun({ before: full, after: full }, pilot("6079", 0));

    expect(before).toEqual(full);
  });
});
