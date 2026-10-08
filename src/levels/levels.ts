import type { LevelDef } from "../types";

// Waves enter about 5 s apart at 1 px a frame; they must be sorted by `at`.
export const LEVELS: LevelDef[] = [
  {
    waves: [
      { at: 60, kind: "straight", count: 3, x: 120, spacing: 120 },
      { at: 360, kind: "sine", count: 4, x: 90, spacing: 100 },
      { at: 660, kind: "straight", count: 5, x: 60, spacing: 90 },
      { at: 960, kind: "bomber", count: 1, x: 240, spacing: 0 },
      { at: 1260, kind: "sine", count: 5, x: 80, spacing: 80 },
      { at: 1560, kind: "straight", count: 3, x: 300, spacing: 60 },
      { at: 1680, kind: "straight", count: 3, x: 60, spacing: 60 },
      { at: 1980, kind: "bomber", count: 2, x: 140, spacing: 200 },
      { at: 2280, kind: "sine", count: 6, x: 65, spacing: 70 },
      { at: 2580, kind: "bomber", count: 1, x: 240, spacing: 0 },
      { at: 2640, kind: "straight", count: 2, x: 120, spacing: 240 },
    ],
  },
];
