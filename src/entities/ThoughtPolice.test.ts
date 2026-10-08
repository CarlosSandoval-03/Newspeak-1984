import { beforeEach, describe, expect, it } from "vitest";
import type { Assets } from "../assets";
import {
  CANVAS_WIDTH,
  THOUGHT_POLICE_FAN_COUNT,
  THOUGHT_POLICE_FIRE_INTERVAL,
  THOUGHT_POLICE_HOVER_Y,
  THOUGHT_POLICE_STATS,
  THOUGHT_POLICE_TIMEOUT,
} from "../config";
import type { Bullet } from "./Bullet";
import { ThoughtPolice } from "./ThoughtPolice";

const images = new Proxy({}, { get: (_, name) => name }) as Assets["image"];

describe("ThoughtPolice", () => {
  let fired: Bullet[];
  let police: ThoughtPolice;

  const ticks = (n: number) => {
    for (let i = 0; i < n; i++) police.update();
  };
  // Until it hovers, plus `extra` frames.
  const arrive = (extra = 0) => {
    while (police.pos.y < THOUGHT_POLICE_HOVER_Y) police.update();
    ticks(extra);
  };

  beforeEach(() => {
    fired = [];
    police = new ThoughtPolice(
      () => ({ x: 240, y: 540 }),
      images,
      (bullet) => fired.push(bullet),
    );
  });

  it("comes down from above the screen to hover, then sways", () => {
    expect(police.pos).toEqual({
      x: CANVAS_WIDTH / 2,
      y: -THOUGHT_POLICE_STATS.halfSize,
    });

    arrive(30);
    const y = police.pos.y;
    ticks(30);

    expect(police.pos.y).toBe(y);
    expect(police.pos.x).not.toBe(CANVAS_WIDTH / 2);
    expect(police.holding).toBe(true);
  });

  it("holds fire on the way in", () => {
    arrive();

    expect(fired).toHaveLength(0);
  });

  it("alternates an aimed triple and a wide fan, all in the regime's red", () => {
    arrive(THOUGHT_POLICE_FIRE_INTERVAL);
    expect(fired).toHaveLength(3);

    ticks(THOUGHT_POLICE_FIRE_INTERVAL);
    expect(fired).toHaveLength(3 + THOUGHT_POLICE_FAN_COUNT);
    expect(fired.every((bullet) => bullet.owner === "regime")).toBe(true);

    // The triple's middle bullet goes straight at the player.
    const middle = fired[1];
    const aim = Math.atan2(540 - middle.pos.y, 240 - middle.pos.x);
    expect(Math.atan2(middle.vel.y, middle.vel.x)).toBeCloseTo(aim);
  });

  it("withdraws off the top once outlasted, and stops firing", () => {
    ticks(THOUGHT_POLICE_TIMEOUT - 1);
    expect(police.holding).toBe(true);

    ticks(1);
    expect(police.holding).toBe(false);
    expect(police.alive).toBe(true);

    const shots = fired.length;
    while (police.alive) police.update();
    expect(police.pos.y).toBeLessThan(-THOUGHT_POLICE_STATS.halfSize);
    expect(fired).toHaveLength(shots);
  });

  it("shows its hp running down, and dies only on the last hit", () => {
    expect(police.health).toBe(1);

    for (let i = 1; i < THOUGHT_POLICE_STATS.hp; i++)
      expect(police.hit()).toBe(false);
    expect(police.health).toBeCloseTo(1 / THOUGHT_POLICE_STATS.hp);

    expect(police.hit()).toBe(true);
    expect(police.holding).toBe(false);
  });
});
