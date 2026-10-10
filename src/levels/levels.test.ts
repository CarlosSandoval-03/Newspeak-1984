import { describe, expect, it } from "vitest";
import {
  CANVAS_WIDTH,
  ENEMY_STATS,
  PICKUP_RADIUS,
  SINE_AMPLITUDE,
} from "../config";
import { removedAt } from "../systems/Newspeak";
import { LEVELS } from "./levels";

describe.each(LEVELS.map((level, i) => [i + 1, level] as const))(
  "level %i",
  (number, level) => {
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
