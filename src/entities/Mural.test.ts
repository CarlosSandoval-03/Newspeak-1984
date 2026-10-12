import type p5 from "p5";
import { describe, expect, it } from "vitest";
import type { Assets } from "../assets";
import { CANVAS_HEIGHT, MURAL_SIZE, RED } from "../config";
import { Mural } from "./Mural";

const assets = {
  image: { "poster-leader": { width: 64, height: 64 } },
  font: { machine: "VT323" },
} as unknown as Assets;

describe("Mural", () => {
  it("paints the portrait on a red field over the slogan's lines, all within its size", () => {
    const texts: { text: string; x: number; y: number }[] = [];
    const rects: {
      color: unknown;
      x: number;
      y: number;
      w: number;
      h: number;
    }[] = [];
    let fill: unknown = null;
    const p = {
      CORNER: "corner",
      CENTER: "center",
      BASELINE: "alphabetic",
      noStroke: () => {},
      imageMode: () => {},
      image: () => {},
      textFont: () => {},
      textSize: () => {},
      textAlign: () => {},
      fill: (color: unknown) => (fill = color),
      rect: (x: number, y: number, w: number, h: number) =>
        rects.push({ color: fill, x, y, w, h }),
      text: (text: string, x: number, y: number) => texts.push({ text, x, y }),
    } as unknown as p5;

    new Mural({ x: 200, y: 300 }, "THE SKY REMEMBERS\nNOTHING", assets).draw(p);

    expect(texts.map(({ text }) => text)).toEqual([
      "THE SKY REMEMBERS",
      "NOTHING",
    ]);
    expect(rects[0].color).toBe(RED);
    const top = 300 - MURAL_SIZE.h / 2;
    for (const { x, y, w, h } of rects) {
      expect(x).toBe(200 - MURAL_SIZE.w / 2);
      expect(y + h).toBeLessThanOrEqual(top + MURAL_SIZE.h);
      expect(w).toBe(MURAL_SIZE.w);
    }
    for (const { y } of texts) expect(y).toBeLessThan(top + MURAL_SIZE.h);
  });

  it("is gone once it has scrolled off the bottom", () => {
    const mural = new Mural({ x: 200, y: CANVAS_HEIGHT }, "OBEY", assets);
    mural.vel = { x: 0, y: MURAL_SIZE.h / 2 + 1 };
    mural.update();

    expect(mural.alive).toBe(false);
  });
});
