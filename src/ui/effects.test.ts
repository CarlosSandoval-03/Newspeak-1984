import type p5 from "p5";
import { describe, expect, it } from "vitest";
import {
  CANVAS_HEIGHT,
  CURSOR_BLINK_FRAMES,
  GLITCH_MAX_OFFSET,
  GLITCH_MAX_SLICES,
  GLITCH_SLICE_MAX,
  GLITCH_SLICE_MIN,
  TYPEWRITER_CPF,
  VIGNETTE_BASE_MAX,
  VIGNETTE_FADE_FRAMES,
  VIGNETTE_PULSE_FRAMES,
} from "../config";
import { glitchSlices, Typewriter, Vignette, wrap } from "./effects";

describe("Vignette", () => {
  const seenFor = (vignette: Vignette, frames: number, seen = true) => {
    for (let i = 0; i < frames; i++) vignette.update(seen, 0, false);
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
      vignette.update(true, 0, false);
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

  it("holds a base that grows with suspicion while unseen, steady until the pursuit", () => {
    const vignette = new Vignette({} as p5);
    const over = (suspicion: number, pursuit: boolean) => {
      const strengths: number[] = [];
      for (let i = 0; i < VIGNETTE_PULSE_FRAMES; i++) {
        vignette.update(false, suspicion, pursuit);
        strengths.push(vignette.strength);
      }
      return strengths;
    };

    expect(new Set(over(0.5, false))).toEqual(
      new Set([0.5 * VIGNETTE_BASE_MAX]),
    );
    expect(Math.max(...over(1, false))).toBe(VIGNETTE_BASE_MAX);

    const beating = over(1, true);
    expect(Math.max(...beating)).toBeCloseTo(VIGNETTE_BASE_MAX, 2);
    expect(Math.min(...beating)).toBeLessThan(VIGNETTE_BASE_MAX * 0.7);
  });
});

describe("glitchSlices", () => {
  // Hands out the given draws in order, then the last one forever.
  const draws =
    (...values: number[]) =>
    () =>
      values.length > 1 ? values.shift()! : values[0];

  it("never glitches at no suspicion", () => {
    expect(glitchSlices(0, draws(0))).toEqual([]);
  });

  it("glitches a frame as often as the intensity is high", () => {
    expect(glitchSlices(0.3, draws(0.3))).toEqual([]);
    expect(glitchSlices(0.3, draws(0.29, 0.5))).not.toEqual([]);
  });

  it("shifts more bands, further, as the intensity grows", () => {
    const weak = glitchSlices(0.2, draws(0, 1));
    const strong = glitchSlices(1, draws(0, 1));

    expect(weak.length).toBeLessThan(strong.length);
    expect(strong).toHaveLength(GLITCH_MAX_SLICES);
    expect(Math.max(...weak.map(({ dx }) => Math.abs(dx)))).toBeLessThan(
      Math.max(...strong.map(({ dx }) => Math.abs(dx))),
    );
    expect(Math.max(...strong.map(({ dx }) => Math.abs(dx)))).toBe(
      GLITCH_MAX_OFFSET,
    );
  });

  it("keeps every band on the screen and in its size range", () => {
    for (const { y, h, dx } of glitchSlices(1, Math.random)) {
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThan(CANVAS_HEIGHT);
      expect(h).toBeGreaterThanOrEqual(GLITCH_SLICE_MIN);
      expect(h).toBeLessThan(GLITCH_SLICE_MAX);
      expect(dx).not.toBe(0);
    }
  });
});

describe("Typewriter", () => {
  const typed = (typewriter: Typewriter, characters: number) => {
    for (let i = 0; i < characters / TYPEWRITER_CPF; i++) typewriter.update();
  };

  it("types each line in turn, a few characters a frame", () => {
    const typewriter = new Typewriter(["ABCD", "EF"]);
    expect(typewriter.shown(0)).toBe("");

    typed(typewriter, 3);
    expect(typewriter.shown(0)).toBe("ABC");
    expect(typewriter.shown(1)).toBe("");
    expect(typewriter.cursor).toEqual({ line: 0, column: 3 });

    typed(typewriter, 2);
    expect(typewriter.typedLine(0)).toBe(true);
    expect(typewriter.shown(1)).toBe("E");
    expect(typewriter.cursor).toEqual({ line: 1, column: 1 });
    expect(typewriter.done).toBe(false);

    typed(typewriter, 10);
    expect(typewriter.done).toBe(true);
    expect(typewriter.shown(1)).toBe("EF");
    expect(typewriter.cursor).toEqual({ line: 1, column: 2 });
  });

  it("reveals the rest at once when finished early, as Enter does", () => {
    const typewriter = new Typewriter(["ABCD", "EF"]);
    typewriter.update();

    typewriter.finish();

    expect(typewriter.done).toBe(true);
    expect([typewriter.shown(0), typewriter.shown(1)]).toEqual(["ABCD", "EF"]);
  });

  it("blinks its cursor", () => {
    const typewriter = new Typewriter(["A"]);
    expect(typewriter.cursorVisible).toBe(true);

    for (let i = 0; i < CURSOR_BLINK_FRAMES; i++) typewriter.update();
    expect(typewriter.cursorVisible).toBe(false);

    for (let i = 0; i < CURSOR_BLINK_FRAMES; i++) typewriter.update();
    expect(typewriter.cursorVisible).toBe(true);
  });
});

describe("wrap", () => {
  it("breaks at spaces, never past the given width", () => {
    expect(wrap("Pilot 6079. We have read your file.", 12)).toEqual([
      "Pilot 6079.",
      "We have read",
      "your file.",
    ]);
  });

  it("fills a line up to the width exactly, and not one character past it", () => {
    expect(wrap("ab cd ef", 5)).toEqual(["ab cd", "ef"]);
    expect(wrap("ab cde", 5)).toEqual(["ab", "cde"]);
  });

  it("keeps a word longer than the width on a line of its own", () => {
    expect(wrap("a unpersonable b", 5)).toEqual(["a", "unpersonable", "b"]);
  });
});
