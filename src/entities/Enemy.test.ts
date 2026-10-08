import type p5 from "p5";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Assets } from "../assets";
import {
  ALERT_FIRE_MULT,
  BOMBER_FAN_COUNT,
  BOMBER_FAN_SPREAD_DEGREES,
  BOMBER_FIRE_INTERVAL,
  CANVAS_HEIGHT,
  ENEMY_BULLET_SPEED,
  ENEMY_FIRE_INTERVAL,
  ENEMY_STATS,
  HIT_FLASH_FRAMES,
  SINE_AMPLITUDE,
  SINE_PERIOD,
} from "../config";
import { resetGame, state } from "../state";
import { ALERT, type EnemyKind, type Vec } from "../types";
import type { Bullet } from "./Bullet";
import { Enemy } from "./Enemy";

// Each image is stood in for by its own name, so a draw call says which sprite it used.
const images = new Proxy({}, { get: (_, name) => name }) as Assets["image"];

describe("Enemy", () => {
  let fired: Bullet[];

  const make = (
    kind: EnemyKind,
    pos: Vec = { x: 240, y: 100 },
    target: Vec = { x: 240, y: 500 },
  ) =>
    new Enemy(
      kind,
      pos,
      () => target,
      images,
      (b) => fired.push(b),
    );

  const ticks = (enemy: Enemy, n: number) => {
    for (let i = 0; i < n; i++) enemy.update();
  };

  const angleOf = (v: Vec) => Math.atan2(v.y, v.x);

  beforeEach(() => {
    resetGame();
    fired = [];
    // No jitter: every enemy fires exactly on its interval.
    vi.spyOn(Math, "random").mockReturnValue(0.5);
  });

  afterEach(() => vi.restoreAllMocks());

  it("flies straight down at its speed", () => {
    const enemy = make("straight");

    ticks(enemy, 10);

    expect(enemy.pos).toEqual({
      x: 240,
      y: 100 + 10 * ENEMY_STATS.straight.speed,
    });
  });

  it("weaves around the column it entered on", () => {
    const enemy = make("sine");

    ticks(enemy, SINE_PERIOD / 4);
    expect(enemy.pos.x).toBeCloseTo(240 + SINE_AMPLITUDE);

    ticks(enemy, (SINE_PERIOD * 3) / 4);
    expect(enemy.pos.x).toBeCloseTo(240);
  });

  it("fires at the player every interval", () => {
    const target = { x: 400, y: 600 };
    const enemy = make("straight", { x: 100, y: 0 }, target);

    ticks(enemy, ENEMY_FIRE_INTERVAL - 1);
    expect(fired).toHaveLength(0);

    ticks(enemy, 1);
    expect(fired).toHaveLength(1);

    const [bullet] = fired;
    const toTarget = { x: target.x - bullet.pos.x, y: target.y - bullet.pos.y };
    expect(bullet.owner).toBe("enemy");
    expect(Math.hypot(bullet.vel.x, bullet.vel.y)).toBeCloseTo(
      ENEMY_BULLET_SPEED,
    );
    expect(angleOf(bullet.vel)).toBeCloseTo(angleOf(toTarget));

    ticks(enemy, ENEMY_FIRE_INTERVAL);
    expect(fired).toHaveLength(2);
  });

  it("reloads faster from alert up, from its next shot on", () => {
    const enemy = make("straight", { x: 100, y: 0 });
    const faster = Math.round(ENEMY_FIRE_INTERVAL / ALERT_FIRE_MULT);

    ticks(enemy, ENEMY_FIRE_INTERVAL - 1);
    state.alertLevel = ALERT.alert;
    ticks(enemy, 1);
    expect(fired).toHaveLength(1);

    ticks(enemy, faster - 1);
    expect(fired).toHaveLength(1);

    ticks(enemy, 1);
    expect(fired).toHaveLength(2);
  });

  it("holds fire until it is on screen", () => {
    const speed = ENEMY_STATS.straight.speed;
    const enemy = make("straight", { x: 240, y: -100 * speed });

    // One tick short of the top edge, so no fire clock has run yet.
    ticks(enemy, 99);
    ticks(enemy, ENEMY_FIRE_INTERVAL - 1);
    expect(fired).toHaveLength(0);

    ticks(enemy, 1);
    expect(fired).toHaveLength(1);
  });

  it("fires a bomber's fan centered on the player", () => {
    const target = { x: 300, y: 600 };
    const enemy = make("bomber", { x: 100, y: 0 }, target);

    ticks(enemy, BOMBER_FIRE_INTERVAL);

    const angles = fired.map((bullet) => angleOf(bullet.vel));
    const middle = fired[(BOMBER_FAN_COUNT - 1) / 2];
    const toTarget = { x: target.x - middle.pos.x, y: target.y - middle.pos.y };
    expect(fired).toHaveLength(BOMBER_FAN_COUNT);
    expect(angleOf(middle.vel)).toBeCloseTo(angleOf(toTarget));
    expect(angles.at(-1)! - angles[0]).toBeCloseTo(
      (BOMBER_FAN_SPREAD_DEGREES * Math.PI) / 180,
    );
  });

  it("flashes for a few frames when a hit doesn't kill it", () => {
    const image = vi.fn();
    const p = {
      CENTER: "center",
      imageMode: () => {},
      image,
      drawingContext: {},
    } as unknown as p5;
    const enemy = make("bomber");
    const lastSprite = () => image.mock.calls.at(-1)?.[0];

    expect(enemy.hit()).toBe(false);
    enemy.draw(p);
    expect(lastSprite()).toBe("enemy-bomber-flash");

    ticks(enemy, HIT_FLASH_FRAMES);
    enemy.draw(p);
    expect(lastSprite()).toBe("enemy-bomber");
  });

  it("dies when its hp runs out", () => {
    const enemy = make("bomber");

    for (let i = 1; i < ENEMY_STATS.bomber.hp; i++)
      expect(enemy.hit()).toBe(false);

    expect(enemy.hit()).toBe(true);
    expect(enemy.alive).toBe(false);
    expect(enemy.hit()).toBe(false);
  });

  it("is removed once its sprite has left the bottom", () => {
    const { halfSize, speed } = ENEMY_STATS.bomber;
    const enemy = make("bomber", {
      x: 240,
      y: CANVAS_HEIGHT + halfSize - speed,
    });

    enemy.update();
    expect(enemy.alive).toBe(true);

    enemy.update();
    expect(enemy.alive).toBe(false);
  });
});
