import type p5 from "p5";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Assets } from "../assets";
import {
  ALERT_FIRE_MULT,
  CANVAS_HEIGHT,
  ENEMY_BULLET_SPEED,
  SCROLL_SPEED,
  TURRET_FIRE_INTERVAL,
  TURRET_STATS,
} from "../config";
import { resetGame, state } from "../state";
import { ALERT, type Vec } from "../types";
import type { Bullet } from "./Bullet";
import { Turret } from "./Turret";

// Each image is stood in for by its own name, so a draw call says which sprite it used.
const images = new Proxy({}, { get: (_, name) => name }) as Assets["image"];

describe("Turret", () => {
  let fired: Bullet[];

  const make = (target: Vec = { x: 240, y: 500 }, pos = { x: 240, y: 100 }) =>
    new Turret(
      pos,
      () => target,
      images,
      (b) => fired.push(b),
    );

  const ticks = (turret: Turret, n: number) => {
    for (let i = 0; i < n; i++) turret.update();
  };

  beforeEach(() => {
    resetGame();
    fired = [];
    // No jitter: every turret fires exactly on its interval.
    vi.spyOn(Math, "random").mockReturnValue(0.5);
  });

  afterEach(() => vi.restoreAllMocks());

  it("scrolls down with the ground", () => {
    const turret = make();

    ticks(turret, 10);

    expect(turret.pos).toEqual({ x: 240, y: 100 + 10 * SCROLL_SPEED });
  });

  it("fires aimed shots from alternate barrel tips", () => {
    const target = { x: 400, y: 400 };
    const turret = make(target);

    ticks(turret, TURRET_FIRE_INTERVAL - 1);
    expect(fired).toHaveLength(0);

    ticks(turret, 1);
    // Read right after each shot: the turret moves before it fires, every tick.
    const first = turret.tip(-1);
    ticks(turret, TURRET_FIRE_INTERVAL);
    const second = turret.tip(1);

    expect(fired).toHaveLength(2);
    expect(fired[0].pos).toEqual(first);
    expect(fired[1].pos).toEqual(second);
    expect(second.x - first.x).not.toBeCloseTo(0);

    for (const bullet of fired) {
      const aim = Math.atan2(target.y - bullet.pos.y, target.x - bullet.pos.x);
      expect(Math.hypot(bullet.vel.x, bullet.vel.y)).toBeCloseTo(
        ENEMY_BULLET_SPEED,
      );
      expect(Math.atan2(bullet.vel.y, bullet.vel.x)).toBeCloseTo(aim, 1);
    }
  });

  it("points its barrels at the player wherever they are", () => {
    const target = { x: 240, y: 500 };
    const turret = make(target);

    expect(turret.aim).toBeCloseTo(Math.PI / 2);

    target.x = 0;
    target.y = 100;
    expect(turret.aim).toBeCloseTo(Math.PI);
  });

  it("reloads faster from alert up", () => {
    const turret = make();
    const faster = Math.round(TURRET_FIRE_INTERVAL / ALERT_FIRE_MULT);
    state.alertLevel = ALERT.alert;

    // The first shot was loaded before the alert; the next one is quicker.
    ticks(turret, TURRET_FIRE_INTERVAL);
    ticks(turret, faster);

    expect(fired).toHaveLength(2);
  });

  it("holds fire until it is on screen", () => {
    const turret = make(undefined, { x: 240, y: -50 });

    // 49 ticks above the top edge, then a full interval on screen.
    ticks(turret, 49 + TURRET_FIRE_INTERVAL - 1);
    expect(fired).toHaveLength(0);

    ticks(turret, 1);
    expect(fired).toHaveLength(1);
  });

  it("is destroyed only by the hit that empties its hp, flashing before that", () => {
    const image = vi.fn();
    const p = new Proxy(
      { CENTER: "center", image },
      {
        get: (target, key) =>
          key in target ? target[key as keyof typeof target] : () => {},
      },
    ) as unknown as p5;
    const turret = make();

    for (let i = 1; i < TURRET_STATS.hp; i++) expect(turret.hit()).toBe(false);
    turret.draw(p);
    expect(image.mock.calls.at(-1)?.[0]).toBe("enemy-aa-gun-flash");

    expect(turret.hit()).toBe(true);
    expect(turret.hit()).toBe(false);
  });

  it("is gone once it has scrolled off the bottom", () => {
    const turret = make(undefined, {
      x: 240,
      y: CANVAS_HEIGHT + TURRET_STATS.halfSize,
    });

    turret.update();

    expect(turret.alive).toBe(false);
  });
});
