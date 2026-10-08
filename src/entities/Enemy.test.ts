import type p5 from "p5";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Assets } from "../assets";
import {
  ALERT_FIRE_MULT,
  BOMBER_FAN_COUNT,
  BOMBER_FAN_SPREAD_DEGREES,
  BOMBER_FIRE_INTERVAL,
  ESCORT_FIRE_INTERVAL,
  ESCORT_OFFSET,
  CANVAS_HEIGHT,
  ENEMY_BULLET_SPEED,
  ENEMY_FIRE_INTERVAL,
  ENEMY_STATS,
  HIT_FLASH_FRAMES,
  HOMING_FRAMES,
  HOMING_TURN_RATE,
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

  describe("autogyro", () => {
    const headingOf = (enemy: Enemy) => angleOf(enemy.vel);

    it("turns toward the player no faster than its turn rate", () => {
      // Straight to the side: the gyro has to swing a quarter turn.
      const gyro = make("homing", { x: 100, y: 100 }, { x: 400, y: 100 });
      const headings: number[] = [];

      for (let i = 0; i < 60; i++) {
        gyro.update();
        headings.push(headingOf(gyro));
      }

      for (let i = 1; i < headings.length; i++)
        expect(Math.abs(headings[i] - headings[i - 1])).toBeLessThanOrEqual(
          HOMING_TURN_RATE + 1e-9,
        );
      expect(headings.at(-1)!).toBeLessThan(Math.PI / 2);
      expect(Math.hypot(gyro.vel.x, gyro.vel.y)).toBeCloseTo(
        ENEMY_STATS.homing.speed,
      );
    });

    it("turns the short way across the ±180° seam", () => {
      // Below and just left: the short way round is clockwise, through π.
      const gyro = make("homing", { x: 300, y: 100 }, { x: 0, y: 101 });

      gyro.update();

      expect(headingOf(gyro)).toBeCloseTo(Math.PI / 2 + HOMING_TURN_RATE);
    });

    it("gives up the chase after a while and flies on", () => {
      const target = { x: 240, y: 300 };
      const gyro = make("homing", { x: 240, y: 0 }, target);

      ticks(gyro, HOMING_FRAMES);
      target.x = 0;
      const heading = headingOf(gyro);
      ticks(gyro, 10);

      expect(headingOf(gyro)).toBe(heading);
    });

    it("never fires", () => {
      const gyro = make("homing", { x: 240, y: 100 }, { x: 240, y: 120 });

      ticks(gyro, HOMING_FRAMES);

      expect(fired).toHaveLength(0);
    });

    it("leaves by any edge", () => {
      // Chasing a player off to the left, it flies out the side.
      const gyro = make("homing", { x: 30, y: 300 }, { x: -1000, y: 300 });

      ticks(gyro, 120);

      expect(gyro.alive).toBe(false);
    });

    it("turns its sprite with its heading and spins a rotor on top", () => {
      const calls: string[] = [];
      const rotate = vi.fn();
      const p = new Proxy(
        { CENTER: "center", drawingContext: {}, rotate },
        {
          get: (target, key) =>
            key in target
              ? target[key as keyof typeof target]
              : () => calls.push(String(key)),
        },
      ) as unknown as p5;
      const gyro = make("homing", { x: 100, y: 100 }, { x: 400, y: 100 });

      ticks(gyro, 10);
      gyro.draw(p);

      expect(rotate).toHaveBeenCalledWith(headingOf(gyro) - Math.PI / 2);
      expect(calls.filter((call) => call === "line")).toHaveLength(2);
    });
  });

  describe("escort", () => {
    const leader = { pos: { x: 240, y: 130 }, holding: true };
    const escort = (side: -1 | 1) =>
      new Enemy(
        "escort",
        leader.pos,
        () => ({ x: 240, y: 540 }),
        images,
        (b) => fired.push(b),
        { leader, side },
      );

    beforeEach(() => {
      leader.pos = { x: 240, y: 130 };
      leader.holding = true;
    });

    it("keeps its side of the leader as it moves", () => {
      const left = escort(-1);
      const right = escort(1);

      leader.pos.x = 300;
      left.update();
      right.update();

      expect(left.pos).toEqual({
        x: 300 - ESCORT_OFFSET.x,
        y: 130 + ESCORT_OFFSET.y,
      });
      expect(right.pos.x).toBe(300 + ESCORT_OFFSET.x);
    });

    it("fires the regime's red bullets", () => {
      const left = escort(-1);

      ticks(left, ESCORT_FIRE_INTERVAL);

      expect(fired).toHaveLength(1);
      expect(fired[0].owner).toBe("regime");
    });

    it("withdraws off the top with its leader, without firing", () => {
      const left = escort(-1);
      leader.holding = false;

      ticks(left, ESCORT_FIRE_INTERVAL);
      expect(left.pos.y).toBeLessThan(130);
      expect(fired).toHaveLength(0);

      ticks(left, 200);
      expect(left.alive).toBe(false);
    });
  });
});
