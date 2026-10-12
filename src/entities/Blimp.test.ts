import type p5 from "p5";
import { describe, expect, it } from "vitest";
import type { Assets } from "../assets";
import { CANVAS_WIDTH } from "../config";
import type { BlimpDef } from "../types";
import { Blimp } from "./Blimp";

const assets = {
  image: { "propaganda-blimp": {}, "propaganda-blimp-shadow": {} },
  font: { machine: "VT323" },
} as unknown as Assets;

// Records the banner's text and the hull and banner positions of one frame.
function drawn(blimp: Blimp) {
  const frame = {
    texts: [] as string[],
    rects: [] as number[],
    hulls: [] as number[],
  };
  let x = 0;
  const p = {
    CENTER: "center",
    CORNER: "corner",
    BASELINE: "alphabetic",
    drawingContext: {},
    imageMode: () => {},
    push: () => {},
    pop: () => {},
    translate: (to: number) => (x = to),
    scale: () => {},
    image: () => frame.hulls.push(x),
    stroke: () => {},
    strokeWeight: () => {},
    noStroke: () => {},
    line: () => {},
    fill: () => {},
    rectMode: () => {},
    rect: (left: number, _y: number, w: number) =>
      frame.rects.push(left + w / 2),
    textFont: () => {},
    textSize: () => {},
    textAlign: () => {},
    text: (text: string) => frame.texts.push(text),
  } as unknown as p5;

  blimp.draw(p);
  return frame;
}

const flyFrom = (from: BlimpDef["from"]) =>
  new Blimp({ at: 0, y: 100, from }, () => "OBEY", assets);

describe("Blimp", () => {
  it("crosses from the side it enters, and is gone only once its banner has passed the other", () => {
    for (const from of ["left", "right"] as const) {
      const blimp = flyFrom(from);
      const past = (x: number) =>
        from === "left" ? x > CANVAS_WIDTH + 100 : x < -100;

      while (!past(blimp.pos.x)) blimp.update();
      // The hull is off the far side, but the banner it tows is still on screen.
      expect(blimp.alive).toBe(true);

      for (let i = 0; blimp.alive && i < 1000; i++) blimp.update();
      expect(blimp.alive).toBe(false);
    }
  });

  it("tows its banner behind it, whichever way it flies", () => {
    const right = drawn(flyFrom("left"));
    const left = drawn(flyFrom("right"));

    expect(right.rects[0]).toBeLessThan(right.hulls.at(-1)!);
    expect(left.rects[0]).toBeGreaterThan(left.hulls.at(-1)!);
  });

  it("goes blank for a moment when the record rewrites its banner", () => {
    let slogan = "ALWAYS OUR ALLY";
    const blimp = new Blimp(
      { at: 0, y: 100, from: "left" },
      () => slogan,
      assets,
    );

    blimp.update();
    expect(drawn(blimp).texts).toEqual(["ALWAYS OUR ALLY"]);

    slogan = "NEVER OUR ALLY";
    blimp.update();
    expect(drawn(blimp).texts).toEqual([]);
    blimp.update();
    expect(drawn(blimp).texts).toEqual(["NEVER OUR ALLY"]);
  });
});
