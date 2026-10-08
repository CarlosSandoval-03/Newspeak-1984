import type p5 from "p5";
import { describe, expect, it } from "vitest";
import { VIGNETTE_FADE_FRAMES, VIGNETTE_PULSE_FRAMES } from "../config";
import { Vignette } from "./effects";

describe("Vignette", () => {
  const seenFor = (vignette: Vignette, frames: number, seen = true) => {
    for (let i = 0; i < frames; i++) vignette.update(seen);
  };

  it("stays clear until the player is seen", () => {
    const vignette = new Vignette({} as p5);

    seenFor(vignette, 100, false);

    expect(vignette.strength).toBe(0);
  });

  it("fades in while seen and beats without ever going out", () => {
    const vignette = new Vignette({} as p5);
    seenFor(vignette, VIGNETTE_FADE_FRAMES);

    const beat: number[] = [];
    for (let i = 0; i < VIGNETTE_PULSE_FRAMES; i++) {
      vignette.update(true);
      beat.push(vignette.strength);
    }

    expect(Math.max(...beat)).toBeCloseTo(1, 2);
    expect(Math.min(...beat)).toBeGreaterThan(0.5);
  });

  it("fades out once the player is out of sight", () => {
    const vignette = new Vignette({} as p5);
    seenFor(vignette, VIGNETTE_FADE_FRAMES);

    seenFor(vignette, VIGNETTE_FADE_FRAMES / 2, false);
    expect(vignette.strength).toBeGreaterThan(0);

    seenFor(vignette, VIGNETTE_FADE_FRAMES / 2, false);
    expect(vignette.strength).toBe(0);
  });
});
