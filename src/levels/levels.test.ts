import { describe, expect, it } from "vitest";
import { CANVAS_WIDTH, ENEMY_STATS, SINE_AMPLITUDE } from "../config";
import { LEVELS } from "./levels";

describe.each(LEVELS.map((level, i) => [i + 1, level] as const))(
  "level %i",
  (_, level) => {
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
  },
);
