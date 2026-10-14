import { CANVAS_HEIGHT, CANVAS_WIDTH } from "../config";
import type { LevelDef } from "../types";

// The stand-in city every level shares until the real ones are written.
const CITY = { seed: 1984, blocks: { plaza: 0.6, rubble: 0 } };
// Just past the last wave, so the sky is soon clear for the landing.
const LENGTH = 3000;
// A level ends at its ministry, in the middle of the screen once the city stops for the boss.
const MINISTRY_AT_THE_END = LENGTH - CANVAS_HEIGHT / 2;

// Waves enter about 5 s apart at 1 px a frame; they must be sorted by `at`.
const LEVEL_1: LevelDef = {
  terrain: {
    ...CITY,
    landmark: { at: MINISTRY_AT_THE_END, ministry: "truth" },
  },
  length: LENGTH,
  waves: [
    { at: 60, kind: "straight", count: 3, x: 120, spacing: 120 },
    { at: 360, kind: "sine", count: 4, x: 90, spacing: 100 },
    { at: 660, kind: "straight", count: 5, x: 60, spacing: 90 },
    { at: 960, kind: "bomber", count: 1, x: 240, spacing: 0 },
    { at: 1260, kind: "sine", count: 5, x: 80, spacing: 80, drops: "ESCAPE" },
    { at: 1560, kind: "straight", count: 3, x: 300, spacing: 60 },
    { at: 1680, kind: "straight", count: 3, x: 60, spacing: 60 },
    {
      at: 1980,
      kind: "bomber",
      count: 2,
      x: 140,
      spacing: 200,
      drops: "FREE",
    },
    { at: 2280, kind: "sine", count: 6, x: 65, spacing: 70, drops: "TRUTH" },
    { at: 2580, kind: "bomber", count: 1, x: 240, spacing: 0 },
    { at: 2640, kind: "straight", count: 2, x: 120, spacing: 240 },
  ],
  // Few and slow-sweeping: level 1 teaches what a cone is before it punishes.
  eyes: [
    {
      type: "tower",
      at: 450,
      on: "rooftop",
      facing: 135,
      range: 170,
      sweepAmp: 35,
      sweepSpeed: 0.03,
    },
    {
      type: "tower",
      at: 900,
      on: "plaza",
      facing: 45,
      range: 180,
      sweepAmp: 30,
      sweepSpeed: 0.025,
    },
    {
      type: "drone",
      at: 1100,
      x: 240,
      path: "patrol",
      facing: 90,
      range: 150,
      sweepAmp: 25,
      sweepSpeed: 0.04,
    },
    {
      type: "tower",
      at: 1500,
      on: "street",
      facing: 90,
      range: 160,
      sweepAmp: 50,
      sweepSpeed: 0.03,
    },
    {
      type: "tower",
      at: 2100,
      on: "rooftop",
      // The roof left of the last mural's.
      x: 0,
      facing: -45,
      range: 200,
      sweepAmp: 30,
      sweepSpeed: 0.02,
    },
    {
      type: "drone",
      at: 2300,
      x: 360,
      path: "sine",
      facing: 90,
      range: 140,
      sweepAmp: 20,
      sweepSpeed: 0.05,
    },
  ],
  // On cross streets, off to the sides, so the player has to weave between their arcs.
  turrets: [
    { at: 700, on: "street", x: 400 },
    { at: 1250, on: "street", x: 60 },
    { at: 1900, on: "street", x: 420 },
  ],
  // FREE is only ever found here, so the first one comes early, to be enjoyed before it is taken.
  pickups: [
    { at: 420, x: 240, word: "FREE" },
    { at: 1800, x: 120, word: "REMEMBER" },
  ],
  // Midway, once the first waves have taught the player to watch the rooftops.
  diary: { at: 1350 },
  // Spread through the level, the Leader watching from the roofs between the fights.
  murals: [{ at: 400 }, { at: 1250 }, { at: 2150 }],
  // On the last roof before the city stops, so the Leader watches the boss fight.
  telescreens: [{ at: 2450 }],
  // Early, on the one open plaza the stand-in city has room on.
  groundSlogans: [{ at: 600 }],
  // The first is in the sky when the record changes halfway, so its banner flips in plain view.
  blimps: [
    { at: 1200, y: 140, from: "left" },
    { at: 2100, y: 220, from: "right" },
  ],
  boss: "fortress",
};

// A stand-in until the real level 2 is written: level 1's data with three fighter waves
// camouflaged, so TRUTH has something to show, and its FREE pickups now tempt instead of help. Its
// own city is split by the river, crossed by a single bridge in the middle, where an AA gun holds
// the crossing; a city with more vertical streets has blocks too narrow for murals.
const CAMOUFLAGED = new Set([660, 1560, 2280]);
const RIVER_AT = LENGTH / 2;
const LEVEL_2: LevelDef = {
  ...LEVEL_1,
  terrain: {
    ...CITY,
    seed: 71,
    river: { at: RIVER_AT, bridges: 1 },
    landmark: { at: MINISTRY_AT_THE_END, ministry: "plenty" },
  },
  waves: LEVEL_1.waves.map((wave) =>
    CAMOUFLAGED.has(wave.at) ? { ...wave, camo: true } : wave,
  ),
  // The towers that would stand on its murals, telescreen, and slogan move to free ground.
  eyes: LEVEL_1.eyes.map((eye) => {
    if (eye.type !== "tower") return eye;
    if (eye.at === 450) return { ...eye, x: CANVAS_WIDTH };
    if (eye.at === 900 || eye.at === 2100) return { ...eye, on: "street" };
    return eye;
  }),
  turrets: [...LEVEL_1.turrets, { at: RIVER_AT, on: "bridge" }],
  boss: "airship",
};

// Levels 3 to 5 replay the stand-in with their own bosses and ministries, so every removal and
// every boss can be played until the real levels are written. Level 3 has a city of its own, in
// rubble, where the land battleship rides the railway at the end, so the Ministry of Peace stands
// halfway, before the railway begins; the ruined prole district has no ministry.
// A ministry reshapes the city around it, so these cities have fewer roofs with room for a mural
// or a telescreen. They keep level 2's towers, but have no river for its AA gun on the bridge.
const STAND_IN: LevelDef = { ...LEVEL_2, turrets: LEVEL_1.turrets };

export const LEVELS: LevelDef[] = [
  LEVEL_1,
  LEVEL_2,
  {
    ...STAND_IN,
    terrain: {
      seed: 1064,
      blocks: { plaza: 0.3, rubble: 0.4 },
      railway: { from: 1800, to: LENGTH },
      landmark: { at: 1500, ministry: "peace" },
    },
    murals: [{ at: 400 }],
    telescreens: [],
    boss: "landship",
  },
  {
    ...STAND_IN,
    terrain: CITY,
    murals: [{ at: 400 }],
    telescreens: [{ at: 1250 }],
    boss: "wing",
  },
  {
    ...STAND_IN,
    terrain: {
      ...CITY,
      landmark: { at: MINISTRY_AT_THE_END, ministry: "love" },
    },
    boss: "eye",
  },
];
