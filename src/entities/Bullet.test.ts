import type p5 from "p5";
import { describe, expect, it, vi } from "vitest";
import { Bullet } from "./Bullet";

describe("Bullet", () => {
  it("dies once it has fully left the screen", () => {
    const bullet = new Bullet("player", { x: 100, y: 0 }, { x: 0, y: -2 }, 3);

    bullet.update();
    expect(bullet.alive).toBe(true);

    bullet.update();
    expect(bullet.alive).toBe(false);
  });

  it("draws the player's fire as a tracer and the enemy's as a dot", () => {
    const rect = vi.fn();
    const circle = vi.fn();
    const p = {
      noStroke: () => {},
      fill: () => {},
      rect,
      circle,
    } as unknown as p5;

    new Bullet("player", { x: 100, y: 100 }, { x: 0, y: -8 }).draw(p);
    expect(rect).toHaveBeenCalled();
    expect(circle).not.toHaveBeenCalled();

    rect.mockClear();
    new Bullet("enemy", { x: 100, y: 100 }, { x: 0, y: 3 }).draw(p);
    expect(circle).toHaveBeenCalled();
    expect(rect).not.toHaveBeenCalled();
  });
});
