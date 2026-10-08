import { describe, expect, it } from "vitest";
import { Bullet } from "./Bullet";

describe("Bullet", () => {
  it("dies once it has fully left the screen", () => {
    const bullet = new Bullet("player", { x: 100, y: 0 }, { x: 0, y: -2 }, 3);

    bullet.update();
    expect(bullet.alive).toBe(true);

    bullet.update();
    expect(bullet.alive).toBe(false);
  });
});
