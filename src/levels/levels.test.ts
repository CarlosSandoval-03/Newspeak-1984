import { describe, expect, it } from "vitest";
import {
  ALLIANCE_FLIP_AT,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  ENEMY_STATS,
  GROUND_SLOGAN_SIZE,
  MURAL_SIZE,
  PICKUP_RADIUS,
  SCROLL_SPEED,
  SINE_AMPLITUDE,
  TELESCREEN_SIZE,
} from "../config";
import { BLIMP_CROSSING_FRAMES } from "../entities/Blimp";
import { removedAt } from "../systems/Newspeak";
import { Spawner } from "../systems/Spawner";
import { anchorNear, middleStreets } from "./layout";
import { LEVELS } from "./levels";

describe.each(LEVELS.map((level, i) => [i + 1, level] as const))(
  "level %i",
  (number, level) => {
    it("stands on its own ministry, but the ruined prole district has none", () => {
      const ministries = [
        "truth",
        "plenty",
        "peace",
        undefined,
        "love",
      ] as const;

      expect(level.terrain.landmark?.ministry).toBe(ministries[number - 1]);
    });

    it("lists its waves in scroll order", () => {
      const at = level.waves.map((wave) => wave.at);

      expect(at).toEqual([...at].sort((a, b) => a - b));
    });

    it("keeps every enemy fully on screen across its path", () => {
      for (const wave of level.waves) {
        const reach =
          ENEMY_STATS[wave.kind].halfSize +
          (wave.kind === "sine" ? SINE_AMPLITUDE : 0);
        const first = wave.x;
        const last = wave.x + (wave.count - 1) * wave.spacing;

        expect(wave.count, `wave at ${wave.at}`).toBeGreaterThan(0);
        expect(first - reach, `wave at ${wave.at}`).toBeGreaterThanOrEqual(0);
        expect(last + reach, `wave at ${wave.at}`).toBeLessThanOrEqual(
          CANVAS_WIDTH,
        );
      }
    });

    it("hides enemies in camouflage only from level 2 on", () => {
      const camouflaged = level.waves.filter((wave) => wave.camo);

      if (number === 1) expect(camouflaged).toEqual([]);
      else expect(camouflaged.length).toBeGreaterThan(0);
    });

    it("finds in its city the ground every element of its data stands on", () => {
      const spawn = () => {};
      expect(
        () =>
          new Spawner(level, {
            enemy: spawn,
            eye: spawn,
            turret: spawn,
            pickup: spawn,
            diary: spawn,
            mural: spawn,
            telescreen: spawn,
            groundSlogan: spawn,
            blimp: spawn,
          }),
      ).not.toThrow();
    });

    it("has a vertical street for every bridge its river asks for", () => {
      const { river, seed } = level.terrain;
      if (river)
        expect(middleStreets(seed).length).toBeGreaterThanOrEqual(
          river.bridges,
        );
    });

    it("has a skylight for its diary to lie on", () => {
      expect(() => anchorNear(level, "skylight", level.diary.at)).not.toThrow();
    });

    it("stands every ground element on a spot of its own", () => {
      const spots = [
        ...level.murals.map(({ at, x }) => anchorNear(level, "mural", at, x)),
        ...level.telescreens.map(({ at, x }) =>
          anchorNear(level, "telescreen", at, x),
        ),
        ...level.groundSlogans.map(({ at, x }) =>
          anchorNear(level, "slogan", at, x),
        ),
        ...level.eyes.flatMap((eye) =>
          eye.type === "tower"
            ? [anchorNear(level, eye.on, eye.at, eye.x)]
            : [],
        ),
        ...level.turrets.map(({ at, on, x }) => anchorNear(level, on, at, x)),
        anchorNear(level, "skylight", level.diary.at),
      ].map(({ x, y }) => `${x},${y}`);

      expect(new Set(spots).size).toBe(spots.length);
    });

    it("keeps every pickup on screen", () => {
      for (const pickup of level.pickups) {
        expect(pickup.x - PICKUP_RADIUS).toBeGreaterThanOrEqual(0);
        expect(pickup.x + PICKUP_RADIUS).toBeLessThanOrEqual(CANVAS_WIDTH);
      }
    });

    // Removed words may still fall as temptations, but the next one to go must be found first.
    it("offers the word the next level removes, while it can still be had", () => {
      const next = removedAt(number + 1);
      const offered = [
        ...level.pickups.map((pickup) => pickup.word),
        ...level.waves.flatMap((wave) => (wave.drops ? [wave.drops] : [])),
      ];

      if (next) expect(offered).toContain(next);
    });
  },
);

it("gives every level a city of its own", () => {
  const seeds = LEVELS.map(({ terrain }) => terrain.seed);

  expect(new Set(seeds).size).toBe(LEVELS.length);
});

// Step 7 writes the levels one at a time; each joins these checks once it is written, while the
// rest still stand in on the prototype.
const WRITTEN = 1;

describe.each(
  LEVELS.slice(0, WRITTEN).map((level, i) => [i + 1, level] as const),
)("level %i, as designed", (_number, level) => {
  const blimpSky = (at: number) => [
    at,
    at + BLIMP_CROSSING_FRAMES * SCROLL_SPEED,
  ];
  // The scroll distances over which a ground message is on screen.
  const onScreen = (
    kind: "mural" | "telescreen" | "slogan",
    defs: { at: number; x?: number }[],
    height: number,
  ) =>
    defs.map(({ at, x }) => {
      const { y } = anchorNear(level, kind, at, x);
      return [y - height / 2, y + CANVAS_HEIGHT + height / 2];
    });

  it("never shows two messages from the sky at once", () => {
    const spans = [
      ...onScreen("mural", level.murals, MURAL_SIZE.h),
      ...onScreen("telescreen", level.telescreens, TELESCREEN_SIZE.h),
      ...onScreen("slogan", level.groundSlogans, GROUND_SLOGAN_SIZE.h),
      ...level.blimps.map(({ at }) => blimpSky(at)),
    ].sort((a, b) => a[0] - b[0]);

    for (let i = 1; i < spans.length; i++)
      expect(spans[i][0]).toBeGreaterThan(spans[i - 1][1]);
  });

  it("has a blimp in the sky when the war changes sides", () => {
    const flip = level.length * ALLIANCE_FLIP_AT;

    expect(
      level.blimps.some(({ at }) => {
        const [from, to] = blimpSky(at);
        return from <= flip && flip <= to;
      }),
    ).toBe(true);
  });

  it("mounts a telescreen over the boss fight, where the city stops", () => {
    const [[from, to]] = onScreen(
      "telescreen",
      level.telescreens.slice(-1),
      TELESCREEN_SIZE.h,
    );

    expect(from).toBeLessThanOrEqual(level.length);
    expect(to).toBeGreaterThanOrEqual(level.length);
  });
});
