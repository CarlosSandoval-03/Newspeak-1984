import type p5 from "p5";
import { describe, expect, it } from "vitest";
import type { Assets } from "../assets";
import {
  CANVAS_HEIGHT,
  DIARY_ALPHA,
  DIARY_HALF_SIZE,
  SCROLL_SPEED,
} from "../config";
import { Diary } from "./Diary";

const images = new Proxy({}, { get: (_, name) => name }) as Assets["image"];

describe("Diary", () => {
  it("lies on the ground, scrolling with it, until it leaves the bottom", () => {
    const diary = new Diary({ x: 100, y: 0 }, images);

    diary.update();
    expect(diary.pos).toEqual({ x: 100, y: SCROLL_SPEED });

    diary.pos.y = CANVAS_HEIGHT + DIARY_HALF_SIZE + 1;
    diary.update();
    expect(diary.alive).toBe(false);
  });

  it("is drawn dim, with no shadow", () => {
    const context = { globalAlpha: 1 };
    const drawn: { name: unknown; alpha: number }[] = [];
    const p = {
      CENTER: "center",
      imageMode: () => {},
      image: (name: unknown) =>
        drawn.push({ name, alpha: context.globalAlpha }),
      drawingContext: context,
    } as unknown as p5;

    new Diary({ x: 0, y: 0 }, images).draw(p);

    expect(drawn).toEqual([{ name: "diary", alpha: DIARY_ALPHA }]);
    expect(context.globalAlpha).toBe(1);
  });
});
