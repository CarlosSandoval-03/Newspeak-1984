import { describe, expect, it } from "vitest";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "../config";
import type { Vec } from "../types";
import { Entity } from "./Entity";

class Dot extends Entity {
  draw(): void {}
}

const at = (pos: Vec) => new Dot(pos, 1);

describe("Entity", () => {
  it("moves by its velocity", () => {
    const dot = at({ x: 10, y: 10 });
    dot.vel = { x: 2, y: -3 };

    dot.update();

    expect(dot.pos).toEqual({ x: 12, y: 7 });
  });

  it("copies its starting position", () => {
    const start = { x: 10, y: 10 };
    const dot = at(start);

    dot.update();
    dot.pos.x = 50;

    expect(start).toEqual({ x: 10, y: 10 });
  });

  it("is offscreen only past the margin", () => {
    expect(at({ x: -10, y: 100 }).isOffscreen(10)).toBe(false);
    expect(at({ x: -11, y: 100 }).isOffscreen(10)).toBe(true);
    expect(at({ x: CANVAS_WIDTH + 11, y: 100 }).isOffscreen(10)).toBe(true);
    expect(at({ x: 100, y: -11 }).isOffscreen(10)).toBe(true);
    expect(at({ x: 100, y: CANVAS_HEIGHT + 11 }).isOffscreen(10)).toBe(true);
  });
});
