import { describe, expect, it } from "vitest";
import { EXPLOSION_FRAMES } from "../config";
import { Explosion } from "./Explosion";

describe("Explosion", () => {
  it("has no hitbox", () => {
    expect(new Explosion({ x: 0, y: 0 }, 24).radius).toBe(0);
  });

  it("stays where it was spawned and fades out on time", () => {
    const explosion = new Explosion({ x: 100, y: 200 }, 24);

    for (let i = 1; i < EXPLOSION_FRAMES; i++) explosion.update();
    expect(explosion.alive).toBe(true);

    explosion.update();
    expect(explosion.alive).toBe(false);
    expect(explosion.pos).toEqual({ x: 100, y: 200 });
  });
});
