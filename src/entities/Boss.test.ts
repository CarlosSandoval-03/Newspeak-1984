import type p5 from "p5";
import { beforeEach, describe, expect, it } from "vitest";
import type { Assets } from "../assets";
import { BOSS_STATS } from "../config";
import type { BossKind, Vec } from "../types";
import { LevelBoss } from "./Boss";
import type { Bullet } from "./Bullet";

const images = new Proxy({}, { get: (_, name) => name }) as Assets["image"];
const degrees = (bullet: Bullet) =>
  (Math.atan2(bullet.vel.y, bullet.vel.x) * 180) / Math.PI;

describe("LevelBoss", () => {
  let fired: Bullet[];
  let target: Vec;

  const make = (kind: BossKind, x = 240) =>
    new LevelBoss(kind, x, {
      images,
      fire: (bullet) => fired.push(bullet),
      target: () => target,
    });
  // Until it is in place, the tick it fires its first volley on included.
  const arrive = (boss: LevelBoss) => {
    while (fired.length === 0) boss.update();
  };

  beforeEach(() => {
    fired = [];
    target = { x: 240, y: 540 };
  });

  it("comes down from above the screen, and only fires once in place", () => {
    const boss = make("fortress");
    const { halfSize, hoverY } = BOSS_STATS.fortress;
    expect(boss.pos.y).toBe(-halfSize);

    while (boss.pos.y < hoverY) {
      boss.update();
      if (boss.pos.y < hoverY) expect(fired).toHaveLength(0);
    }
    arrive(boss);
    expect(boss.pos.y).toBe(hoverY);
  });

  it("sways across the sky in the air, and along its street on the ground", () => {
    const air = make("fortress");
    const ground = make("landship", 208);
    arrive(air);
    fired = [];
    arrive(ground);

    const xs = new Set<number>();
    const ys = new Set<number>();
    for (let i = 0; i < 200; i++) {
      air.update();
      ground.update();
      expect(air.pos.y).toBe(BOSS_STATS.fortress.hoverY);
      expect(ground.pos.x).toBe(208);
      xs.add(Math.round(air.pos.x));
      ys.add(Math.round(ground.pos.y));
    }
    expect(xs.size).toBeGreaterThan(10);
    expect(ys.size).toBeGreaterThan(10);
  });

  it("fires its phase's volleys in turn, one every interval", () => {
    const boss = make("fortress");
    const [{ interval, volleys }] = BOSS_STATS.fortress.phases;
    arrive(boss);
    expect(fired).toHaveLength(volleys[0].count);

    for (let i = 1; i < interval; i++) boss.update();
    expect(fired).toHaveLength(volleys[0].count);
    boss.update();
    expect(fired).toHaveLength(volleys[0].count + volleys[1].count);
  });

  it("centers an aimed volley on the player, and a downward one straight down", () => {
    const boss = make("fortress");
    target = { x: 240 + 300, y: BOSS_STATS.fortress.hoverY };
    arrive(boss);
    const [aimed, down] = BOSS_STATS.fortress.phases[0].volleys;

    // Aimed straight right, at a player level with it.
    const middle = degrees(fired[(aimed.count - 1) / 2]);
    expect(middle).toBeCloseTo(
      (Math.atan2(target.y - boss.pos.y, target.x - boss.pos.x) * 180) /
        Math.PI,
    );
    expect(degrees(fired[0]) - degrees(fired.at(-1)!)).toBeCloseTo(
      -aimed.spread,
    );

    fired = [];
    for (let i = 0; i < BOSS_STATS.fortress.phases[0].interval; i++)
      boss.update();
    expect(degrees(fired[(down.count - 1) / 2])).toBeCloseTo(90);
  });

  it("fires a lone bullet straight at the player", () => {
    const boss = make("airship");
    const [, single] = BOSS_STATS.airship.phases[0].volleys;
    expect(single.count).toBe(1);
    arrive(boss);
    fired = [];
    for (let i = 0; i < BOSS_STATS.airship.phases[0].interval; i++)
      boss.update();

    expect(fired).toHaveLength(1);
    expect(degrees(fired[0])).toBeCloseTo(
      (Math.atan2(target.y - boss.pos.y, target.x - boss.pos.x) * 180) /
        Math.PI,
    );
  });

  it("moves on to its later phases as its hp runs low", () => {
    const boss = make("fortress");
    const { hp, phases } = BOSS_STATS.fortress;
    arrive(boss);
    boss.hit(Math.ceil(hp * (1 - phases[1].from)));
    fired = [];

    for (let i = 0; i < phases[1].interval; i++) boss.update();

    expect(fired.length).toBeGreaterThan(0);
  });

  it("casts a shadow in the air, but not on the ground", () => {
    const drawn = (boss: LevelBoss) => {
      const names: unknown[] = [];
      boss.draw({
        CENTER: "center",
        drawingContext: {},
        imageMode: () => {},
        image: (name: unknown) => names.push(name),
      } as unknown as p5);
      return names;
    };

    expect(drawn(make("fortress"))).toEqual([
      "boss-fortress-shadow",
      "boss-fortress",
    ]);
    expect(drawn(make("landship"))).toEqual(["boss-landship"]);
  });

  it("fires the regime's red only for the Eye", () => {
    for (const kind of Object.keys(BOSS_STATS) as BossKind[]) {
      fired = [];
      arrive(make(kind));
      expect(fired.every(({ owner }) => owner === "regime")).toBe(
        kind === "eye",
      );
    }
  });
});
