import type p5 from "p5";
import { describe, expect, it } from "vitest";
import { CANVAS_HEIGHT, GROUND_SLOGAN_SIZE } from "../config";
import { GroundSlogan } from "./GroundSlogan";

const font = "VT323" as unknown as p5.Font;

describe("GroundSlogan", () => {
  it("paints one word a line, stacked around its place and within its size", () => {
    const texts: { text: string; x: number; y: number }[] = [];
    const p = {
      CENTER: "center",
      noStroke: () => {},
      textFont: () => {},
      textSize: () => {},
      textAlign: () => {},
      fill: () => {},
      text: (text: string, x: number, y: number) => texts.push({ text, x, y }),
    } as unknown as p5;

    new GroundSlogan({ x: 320, y: 300 }, "LOOK UP", font).draw(p);

    expect(texts.map(({ text }) => text)).toEqual(["LOOK", "UP"]);
    expect(texts[0].y + texts[1].y).toBe(600);
    for (const { x, y } of texts) {
      expect(x).toBe(320);
      expect(Math.abs(y - 300)).toBeLessThan(GROUND_SLOGAN_SIZE.h / 2);
    }
  });

  it("is gone once it has scrolled off the bottom", () => {
    const slogan = new GroundSlogan({ x: 320, y: CANVAS_HEIGHT }, "OBEY", font);
    slogan.vel = { x: 0, y: GROUND_SLOGAN_SIZE.h / 2 + 1 };
    slogan.update();

    expect(slogan.alive).toBe(false);
  });
});
