import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LANGUAGES, setLanguage } from "../i18n";
import { STRIKE_FRAMES } from "../config";
import { honorRollRows, TamperedHonorRoll } from "./honorRollTable";

describe("honorRollRows", () => {
  const roll = [
    { pilotId: "6079", score: 4210, unperson: false },
    { pilotId: "0042", score: 0, unperson: true },
  ];

  beforeEach(() => {
    vi.stubGlobal("document", { documentElement: {} });
    vi.stubGlobal("localStorage", { setItem: () => {} });
  });

  afterEach(() => {
    setLanguage("en");
    vi.unstubAllGlobals();
  });

  it("names each place, the pilot or the unperson, and the score", () => {
    expect(honorRollRows(roll)).toEqual([
      " 1. PILOT 6079     004210",
      " 2. [UNPERSON]     000000",
    ]);
  });

  it("lines up the scores of every row, in every language", () => {
    const tenth = Array.from({ length: 10 }, () => roll[0]);

    for (const language of LANGUAGES) {
      setLanguage(language);
      const lengths = honorRollRows([...roll, ...tenth]).map(
        (row) => row.length,
      );
      expect(new Set(lengths).size).toBe(1);
    }
  });
});

describe("TamperedHonorRoll", () => {
  const kept = { pilotId: "0001", score: 3000, unperson: false };
  const altered = { pilotId: "0002", score: 2000, unperson: false };
  const erased = { pilotId: "0003", score: 1000, unperson: false };
  const tampering = {
    before: [kept, altered, erased],
    after: [
      kept,
      { ...altered, score: 2500 },
      { ...erased, score: 0, unperson: true },
    ],
  };
  const lines = (roll: TamperedHonorRoll) =>
    roll["lines"].map((_, line) => roll["shown"](line));

  it("types the archive as it stood first", () => {
    const roll = new TamperedHonorRoll(tampering);
    while (!roll["typing"].done) roll.update();

    expect(lines(roll)).toEqual([
      "HONOR ROLL",
      " 1. PILOT 0001     003000",
      " 2. PILOT 0002     002000",
      " 3. PILOT 0003     001000",
    ]);
    expect(roll.done).toBe(false);
  });

  it("then strikes and retypes each changed row in turn, leaving the rest alone", () => {
    const roll = new TamperedHonorRoll(tampering);
    while (!roll["typing"].done) roll.update();

    // The first change: struck through, the next row untouched.
    for (let i = 0; i < STRIKE_FRAMES; i++) roll.update();
    expect(roll["struck"](2)).toBe(1);
    expect(roll["struck"](3)).toBe(0);

    while (roll["current"] === 0) roll.update();
    expect(roll["shown"](2)).toBe(" 2. PILOT 0002     002500");
    expect(roll["struck"](2)).toBe(0);

    while (!roll.done) roll.update();
    expect(lines(roll)).toEqual([
      "HONOR ROLL",
      " 1. PILOT 0001     003000",
      " 2. PILOT 0002     002500",
      " 3. [UNPERSON]     000000",
    ]);
  });

  it("shows it all as the Ministry left it at once when finished", () => {
    const roll = new TamperedHonorRoll(tampering);
    roll.finish();

    expect(roll.done).toBe(true);
    expect(lines(roll)[3]).toBe(" 3. [UNPERSON]     000000");
  });

  it("notes an empty archive, and is done once it is typed", () => {
    const roll = new TamperedHonorRoll({ before: [], after: [] });
    while (!roll.done) roll.update();

    expect(lines(roll)).toEqual(["HONOR ROLL", "NO RECORDS."]);
  });

  it("says whether the Ministry touched any row", () => {
    const untouched = { before: [kept], after: [kept] };

    expect(new TamperedHonorRoll(tampering).tampered).toBe(true);
    expect(new TamperedHonorRoll(untouched).tampered).toBe(false);
    expect(new TamperedHonorRoll({ before: [], after: [] }).tampered).toBe(
      false,
    );
  });
});
