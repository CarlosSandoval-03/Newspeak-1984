import type p5 from "p5";
import { describe, expect, it } from "vitest";
import {
  CURSOR_BLINK_FRAMES,
  TYPEWRITER_CPF,
  VIGNETTE_FADE_FRAMES,
  VIGNETTE_PULSE_FRAMES,
} from "../config";
import { Typewriter, Vignette, wrap } from "./effects";

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
