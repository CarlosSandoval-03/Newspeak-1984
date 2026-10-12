import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CANVAS_WIDTH,
  DIARY_HALF_SIZE,
  ENEMY_STATS,
  EYE_STATS,
  GROUND_SLOGAN_SIZE,
  GYRO_INTERVAL,
  MURAL_SIZE,
  PICKUP_RADIUS,
  REINFORCEMENT_GAP,
  TELESCREEN_SIZE,
  TURRET_STATS,
} from "../config";
import { anchorNear } from "../levels/layout";
import {
  ALERT,
  type BlimpDef,
  type EnemyKind,
  type EyeDef,
  type LevelDef,
  type Vec,
  type Word,
} from "../types";
import { Spawner } from "./Spawner";

const cone = { facing: 90, range: 100, sweepAmp: 0, sweepSpeed: 0 };
const level: LevelDef = {
  // Level 1's recipe, so there are rooftops, and skylights for the diary.
  terrain: { seed: 1984, blocks: { plaza: 0.6, rubble: 0 } },
  length: 100_000,
  boss: "fortress",
  murals: [{ at: 500 }, { at: 2000 }],
  telescreens: [{ at: 1200 }],
  groundSlogans: [{ at: 700 }],
  blimps: [{ at: 350, y: 120, from: "right" }],
  waves: [
    { at: 100, kind: "straight", count: 3, x: 50, spacing: 40 },
    { at: 200, kind: "bomber", count: 1, x: 240, spacing: 0, drops: "FREE" },
    { at: 200, kind: "sine", count: 2, x: 100, spacing: 60 },
  ],
  eyes: [
    { type: "tower", at: 600, on: "street", ...cone },
    { type: "drone", at: 150, x: 300, path: "patrol", ...cone },
  ],
  turrets: [{ at: 300, on: "street", x: 400 }],
  pickups: [{ at: 250, x: 180, word: "REMEMBER" }],
  diary: { at: 450 },
};

describe("Spawner", () => {
  let spawned: { kind: EnemyKind; pos: Vec; drops: Word | null }[];
  let watching: { def: EyeDef; pos: Vec }[];
  let turrets: Vec[];
  let pickups: { word: Word; pos: Vec }[];
  let diaries: Vec[];
  let murals: { pos: Vec; index: number }[];
  let slogans: { pos: Vec; index: number }[];
  let telescreens: { pos: Vec; index: number }[];
  let blimps: { def: BlimpDef; index: number }[];
  let spawner: Spawner;

  beforeEach(() => {
    spawned = [];
    watching = [];
    turrets = [];
    pickups = [];
    diaries = [];
    murals = [];
    slogans = [];
    telescreens = [];
    blimps = [];
    spawner = new Spawner(level, {
      enemy: (kind, pos, { drops }) => spawned.push({ kind, pos, drops }),
      eye: (def, pos) => watching.push({ def, pos }),
      turret: (pos) => turrets.push(pos),
      pickup: (word, pos) => pickups.push({ word, pos }),
      diary: (pos) => diaries.push(pos),
      mural: (pos, index) => murals.push({ pos, index }),
      telescreen: (pos, index) => telescreens.push({ pos, index }),
      groundSlogan: (pos, index) => slogans.push({ pos, index }),
      blimp: (def, index) => blimps.push({ def, index }),
    });
  });

  it("paints each mural on the roof with room for it nearest its distance, as the roof comes in", () => {
    const anchor = anchorNear(level, "mural", 500);
    const due = anchor.y - MURAL_SIZE.h / 2;

    spawner.update(due - 1, ALERT.normal);
    expect(murals).toEqual([]);
    spawner.update(due, ALERT.normal);
    expect(murals).toEqual([
      { pos: { x: anchor.x, y: due - anchor.y }, index: 0 },
    ]);
  });

  it("mounts each telescreen on the roof with room for it nearest its distance", () => {
    const anchor = anchorNear(level, "telescreen", 1200);
    const due = anchor.y - TELESCREEN_SIZE.h / 2;

    spawner.update(due - 1, ALERT.normal);
    expect(telescreens).toEqual([]);
    spawner.update(due, ALERT.normal);
    expect(telescreens).toEqual([
      { pos: { x: anchor.x, y: due - anchor.y }, index: 0 },
    ]);
  });

  it("paints each ground slogan on the open plaza with room for it nearest its distance", () => {
    const anchor = anchorNear(level, "slogan", 700);
    const due = anchor.y - GROUND_SLOGAN_SIZE.h / 2;

    spawner.update(due - 1, ALERT.normal);
    expect(slogans).toEqual([]);
    spawner.update(due, ALERT.normal);
    expect(slogans).toEqual([
      { pos: { x: anchor.x, y: due - anchor.y }, index: 0 },
    ]);
  });

  it("sends a blimp across when the scroll reaches it", () => {
    spawner.update(349, ALERT.normal);
    expect(blimps).toEqual([]);
    spawner.update(350, ALERT.normal);
    expect(blimps).toEqual([{ def: level.blimps[0], index: 0 }]);
  });

  it("spawns a wave when the scroll reaches it, just above the top edge", () => {
    spawner.update(99, ALERT.normal);
    expect(spawned).toHaveLength(0);

    spawner.update(100, ALERT.normal);
    const y = -ENEMY_STATS.straight.halfSize;
    expect(spawned).toEqual([
      { kind: "straight", pos: { x: 50, y }, drops: null },
      { kind: "straight", pos: { x: 90, y }, drops: null },
      { kind: "straight", pos: { x: 130, y }, drops: null },
    ]);
  });

  it("spawns each wave only once", () => {
    spawner.update(100, ALERT.normal);
    spawner.update(101, ALERT.normal);
    spawner.update(150, ALERT.normal);

    expect(spawned).toHaveLength(3);
  });

  it("spawns every wave the scroll has passed in one tick", () => {
    spawner.update(500, ALERT.normal);

    expect(spawned.map((enemy) => enemy.kind)).toEqual([
      "straight",
      "straight",
      "straight",
      "bomber",
      "sine",
      "sine",
    ]);
  });

  it("flies a drone in above the top edge when the scroll reaches it", () => {
    spawner.update(149, ALERT.normal);
    expect(watching).toHaveLength(0);

    spawner.update(150, ALERT.normal);
    expect(watching).toEqual([
      {
        def: level.eyes[1],
        pos: { x: 300, y: -EYE_STATS.drone.halfSize },
      },
    ]);
  });

  it("stands a tower on its anchor, entering as the ground under it does", () => {
    const anchor = anchorNear(level, "street", 600);
    const due = anchor.y - EYE_STATS.tower.halfSize;

    spawner.update(due - 1, ALERT.normal);
    expect(watching.map(({ def }) => def.type)).toEqual(["drone"]);

    spawner.update(due, ALERT.normal);
    expect(watching[1]).toEqual({
      def: level.eyes[0],
      pos: { x: anchor.x, y: -EYE_STATS.tower.halfSize },
    });
  });

  it("keeps a late tower pinned to its spot on the ground", () => {
    const anchor = anchorNear(level, "street", 600);

    spawner.update(anchor.y + 200, ALERT.normal);

    expect(watching[1].pos).toEqual({ x: anchor.x, y: 200 });
  });

  it("sends reinforcements from alert up, a row behind the wave", () => {
    spawner.update(100, ALERT.alert);

    // Three grow to four: the extra one flies behind the first.
    const half = ENEMY_STATS.straight.halfSize;
    const behind = -half - (half * 2 + REINFORCEMENT_GAP);
    expect(spawned.map(({ pos }) => pos)).toEqual([
      { x: 50, y: -half },
      { x: 90, y: -half },
      { x: 130, y: -half },
      { x: 50, y: behind },
    ]);
  });

  it("doubles a lone bomber in line, never on the same spot", () => {
    spawner.update(150, ALERT.normal);
    spawned = [];
    spawner.update(200, ALERT.pursuit);

    const bombers = spawned.filter(({ kind }) => kind === "bomber");
    expect(bombers).toHaveLength(2);
    expect(bombers[0].pos.x).toBe(bombers[1].pos.x);
    expect(bombers[0].pos.y).not.toBe(bombers[1].pos.y);
    // Two sine enemies grow to three.
    expect(spawned.filter(({ kind }) => kind === "sine")).toHaveLength(3);
  });

  describe("in pursuit", () => {
    const gyros = () => spawned.filter(({ kind }) => kind === "homing");

    it("sends no autogyros below pursuit", () => {
      for (let scroll = 0; scroll < 1000; scroll++)
        spawner.update(scroll, ALERT.alert);

      expect(gyros()).toHaveLength(0);
    });

    it("sends one at once, then one every interval", () => {
      for (let scroll = 0; scroll <= GYRO_INTERVAL * 2; scroll++)
        spawner.update(scroll, ALERT.pursuit);

      expect(gyros()).toHaveLength(3);
    });

    it("keeps its pace when suspicion dips out of pursuit and back", () => {
      spawner.update(0, ALERT.pursuit);
      spawner.update(1, ALERT.alert);
      spawner.update(2, ALERT.pursuit);

      expect(gyros()).toHaveLength(1);
    });

    it("brings each one in above the top edge, fully across the screen", () => {
      const half = ENEMY_STATS.homing.halfSize;

      for (const roll of [0, 0.999]) {
        vi.spyOn(Math, "random").mockReturnValue(roll);
        spawned = [];
        new Spawner(level, {
          enemy: (kind, pos, { drops }) => spawned.push({ kind, pos, drops }),
          eye: () => {},
          turret: () => {},
          pickup: () => {},
          diary: () => {},
          mural: () => {},
          telescreen: () => {},
          groundSlogan: () => {},
          blimp: () => {},
        }).update(0, ALERT.thoughtPolice);

        const [{ pos }] = gyros();
        expect(pos.y).toBe(-half);
        expect(pos.x).toBeGreaterThanOrEqual(half);
        expect(pos.x).toBeLessThanOrEqual(CANVAS_WIDTH - half);
      }
      vi.restoreAllMocks();
    });
  });

  it("gives a wave's word to its last enemy only", () => {
    spawner.update(200, ALERT.normal);

    expect(
      spawned.filter(({ kind }) => kind === "bomber").map(({ drops }) => drops),
    ).toEqual(["FREE"]);
  });

  it("gives it to the last reinforcement once the regime is on alert", () => {
    spawner.update(200, ALERT.alert);

    expect(
      spawned.filter(({ kind }) => kind === "bomber").map(({ drops }) => drops),
    ).toEqual([null, "FREE"]);
  });

  it("camouflages every enemy of a wave marked so, and only those", () => {
    const camo: boolean[] = [];
    new Spawner(
      {
        ...level,
        waves: [
          { at: 0, kind: "straight", count: 2, x: 50, spacing: 40, camo: true },
          { at: 0, kind: "sine", count: 1, x: 200, spacing: 0 },
        ],
      },
      {
        enemy: (_kind, _pos, traits) => camo.push(traits.camo),
        eye: () => {},
        turret: () => {},
        pickup: () => {},
        diary: () => {},
        mural: () => {},
        telescreen: () => {},
        groundSlogan: () => {},
        blimp: () => {},
      },
    ).update(0, ALERT.alert);

    expect(camo).toEqual([true, true, true, false, false]);
  });

  it("drops a pickup in above the top edge when the scroll reaches it", () => {
    spawner.update(249, ALERT.normal);
    expect(pickups).toHaveLength(0);

    spawner.update(250, ALERT.normal);
    expect(pickups).toEqual([
      { word: "REMEMBER", pos: { x: 180, y: -PICKUP_RADIUS } },
    ]);
  });

  it("lays the diary on the skylight nearest its place, entering with the ground", () => {
    const anchor = anchorNear(level, "skylight", 450);
    const due = anchor.y - DIARY_HALF_SIZE;

    spawner.update(due - 1, ALERT.normal);
    expect(diaries).toHaveLength(0);

    spawner.update(due, ALERT.normal);
    expect(diaries).toEqual([{ x: anchor.x, y: -DIARY_HALF_SIZE }]);
  });

  it("stands a turret on the anchor its data points to, entering with the ground", () => {
    const anchor = anchorNear(level, "street", 300, 400);
    const due = anchor.y - TURRET_STATS.halfSize;

    spawner.update(due - 1, ALERT.normal);
    expect(turrets).toHaveLength(0);

    spawner.update(due, ALERT.normal);
    expect(turrets).toEqual([{ x: anchor.x, y: -TURRET_STATS.halfSize }]);
  });

  describe("while the Thought Police hold the sky", () => {
    it("stops the waves' clock, then picks up where it left off", () => {
      spawner.update(50, ALERT.alert);
      spawner.update(150, ALERT.thoughtPolice, true);
      expect(spawned.filter(({ kind }) => kind === "straight")).toHaveLength(0);

      // Held for 100 of scroll, so the wave due at 100 comes at 200, not skipped.
      spawner.update(199, ALERT.alert);
      expect(spawned.filter(({ kind }) => kind === "straight")).toHaveLength(0);
      spawner.update(200, ALERT.alert);
      expect(
        spawned.filter(({ kind }) => kind === "straight").length,
      ).toBeGreaterThan(0);
    });

    it("sends no autogyros", () => {
      for (let scroll = 0; scroll < GYRO_INTERVAL * 3; scroll++)
        spawner.update(scroll, ALERT.thoughtPolice, true);

      expect(spawned.filter(({ kind }) => kind === "homing")).toHaveLength(0);
    });

    it("keeps the ground coming", () => {
      spawner.update(150, ALERT.thoughtPolice, true);

      expect(watching.map(({ def }) => def.type)).toContain("drone");
    });
  });
});
