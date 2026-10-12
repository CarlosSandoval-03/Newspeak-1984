import type p5 from "p5";
import { beforeEach, describe, expect, it } from "vitest";
import type { Assets } from "../assets";
import { BOSS_STATS, DAMAGE_END, INK, PAPER, RED } from "../config";
import type { BossKind, Vec } from "../types";
import { LevelBoss } from "./Boss";
import type { BossDamage } from "./BossDamage";
import type { Bullet } from "./Bullet";

const images = new Proxy({}, { get: (_, name) => name }) as Assets["image"];
const degrees = (bullet: Bullet) =>
  (Math.atan2(bullet.vel.y, bullet.vel.x) * 180) / Math.PI;

describe("LevelBoss", () => {
  let fired: Bullet[];
  let target: Vec;

  // Its damage hands back the health it is drawn at, to show which sprite was used.
  const damage = {
    sprite: (health: number) => `wrecked ${health}`,
  } as unknown as BossDamage;
  const make = (kind: BossKind, x = 240) =>
    new LevelBoss(
      kind,
      x,
      { images, fire: (bullet) => fired.push(bullet), target: () => target },
      damage,
    );
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

  it("keeps swaying and firing through every sway, above its place as well as below", () => {
    for (const kind of ["landship", "fortress"] as const) {
      const boss = make(kind);
      const { sway, hoverY, phases } = BOSS_STATS[kind];
      arrive(boss);

      // The second sway, so the first half of the run can't hide a stall.
      for (let i = 0; i < sway.period; i++) boss.update();
      fired = [];
      const ys = new Set<number>();
      for (let i = 0; i < sway.period; i++) {
        boss.update();
        ys.add(Math.sign(Math.round(boss.pos.y - hoverY)));
      }

      expect(fired.length).toBeGreaterThanOrEqual(
        Math.floor(sway.period / phases[0].interval),
      );
      if (BOSS_STATS[kind].ground) expect(ys).toEqual(new Set([-1, 0, 1]));
    }
  });

  it("keeps a ground boss whole on screen as it drives its street", () => {
    for (const { ground, hoverY, sway, halfSize } of Object.values(BOSS_STATS))
      if (ground)
        expect(hoverY - sway.amp - halfSize).toBeGreaterThanOrEqual(0);
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

  it("casts a shadow in the air, but not on the ground", () => {
    expect(drawn(make("fortress"))).toEqual([
      "boss-fortress-shadow",
      "wrecked 1",
    ]);
    expect(drawn(make("landship"))).toEqual(["wrecked 1"]);
  });

  it("draws its hull at its health, and flashes and casts its shadow as a wreck at the end", () => {
    const boss = make("fortress");
    const { hp } = BOSS_STATS.fortress;
    boss.hit(hp * (1 - DAMAGE_END) - 1);
    expect(drawn(boss)).toEqual([
      "boss-fortress-shadow",
      "boss-fortress-flash",
    ]);
    expect(boss.health).toBeGreaterThan(DAMAGE_END);

    boss.hit(1);
    for (let i = 0; i < 10; i++) boss.update();
    expect(drawn(boss)).toEqual([
      "boss-fortress-damaged-shadow",
      `wrecked ${DAMAGE_END}`,
    ]);
    boss.hit(1);
    expect(drawn(boss)[1]).toBe("boss-fortress-damaged-flash");
  });

  describe("the Eye's pupil", () => {
    // The fills and the rects drawn after the hull, as [color, x, y, w].
    const painted = (boss: LevelBoss) => {
      const calls: unknown[][] = [];
      let fill: unknown = null;
      boss.draw({
        CENTER: "center",
        CORNER: "corner",
        drawingContext: {},
        imageMode: () => {},
        image: () => {},
        noStroke: () => {},
        rectMode: () => {},
        fill: (color: unknown) => (fill = color),
        rect: (x: number, y: number, w: number) => calls.push([fill, x, y, w]),
      } as unknown as p5);
      return calls;
    };
    // The middle row of the disc drawn in this color: its center and its width.
    const middle = (calls: unknown[][], color: string) => {
      const rows = calls.filter(([fill]) => fill === color);
      const [, x, y, w] = rows[(rows.length - 1) / 2] as number[];
      return { x: x + (w - 1) / 2, y, w };
    };

    it("is patched over with iris, then drawn looking toward the pilot", () => {
      const eye = make("eye");
      eye.pos = { x: 240, y: 140 };
      target = { x: 480, y: 140 };

      const calls = painted(eye);

      expect(middle(calls, RED)).toEqual({ x: 239, y: 140, w: 15 });
      expect(middle(calls, INK)).toEqual({ x: 242, y: 140, w: 11 });
      expect(calls.at(-1)).toEqual([PAPER, 244, 142, 1]);
    });

    it("looks down at a pilot below", () => {
      const eye = make("eye");
      eye.pos = { x: 240, y: 140 };
      target = { x: 239, y: 540 };

      expect(middle(painted(eye), INK)).toMatchObject({ x: 239, y: 143 });
    });

    it("is hidden by the flash, and only the Eye has one", () => {
      const eye = make("eye");
      eye.hit();

      expect(painted(eye)).toEqual([]);
      expect(painted(make("wing"))).toEqual([]);
    });
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
