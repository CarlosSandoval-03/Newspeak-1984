import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LANGUAGES, setLanguage } from "../i18n";
import { honorRollRows } from "./honorRollTable";

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
