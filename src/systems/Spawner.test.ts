import { beforeEach, describe, expect, it } from "vitest";
import { ENEMY_STATS, EYE_STATS } from "../config";
import { anchorNear } from "../levels/layout";
import type { EnemyKind, EyeDef, LevelDef, Vec } from "../types";
import { Spawner } from "./Spawner";

const cone = { facing: 90, range: 100, sweepAmp: 0, sweepSpeed: 0 };
const level: LevelDef = {
  terrain: { seed: 1, blocks: { plaza: 0, rubble: 0 } },
  waves: [
    { at: 100, kind: "straight", count: 3, x: 50, spacing: 40 },
    { at: 200, kind: "bomber", count: 1, x: 240, spacing: 0 },
    { at: 200, kind: "sine", count: 2, x: 100, spacing: 60 },
  ],
  eyes: [
    { type: "tower", at: 600, on: "street", ...cone },
    { type: "drone", at: 150, x: 300, path: "patrol", ...cone },
  ],
};

describe("Spawner", () => {
  let spawned: { kind: EnemyKind; pos: Vec }[];
  let watching: { def: EyeDef; pos: Vec }[];
  let spawner: Spawner;

  beforeEach(() => {
    spawned = [];
    watching = [];
    spawner = new Spawner(level, {
      enemy: (kind, pos) => spawned.push({ kind, pos }),
      eye: (def, pos) => watching.push({ def, pos }),
    });
  });

  it("spawns a wave when the scroll reaches it, just above the top edge", () => {
    spawner.update(99);
    expect(spawned).toHaveLength(0);

    spawner.update(100);
    const y = -ENEMY_STATS.straight.halfSize;
    expect(spawned).toEqual([
      { kind: "straight", pos: { x: 50, y } },
      { kind: "straight", pos: { x: 90, y } },
      { kind: "straight", pos: { x: 130, y } },
    ]);
  });

  it("spawns each wave only once", () => {
    spawner.update(100);
    spawner.update(101);
    spawner.update(150);

    expect(spawned).toHaveLength(3);
  });

  it("spawns every wave the scroll has passed in one tick", () => {
    spawner.update(500);

    expect(spawned.map((enemy) => enemy.kind)).toEqual([
      "straight",
      "straight",
      "straight",
      "bomber",
      "sine",
      "sine",
    ]);
  });

  it("is done after the last wave and eye, and starts over from where it restarts", () => {
    const ground = anchorNear(level.terrain, "street", 600).y;
    const last = ground - EYE_STATS.tower.halfSize;

    spawner.update(last - 1);
    expect(spawner.done).toBe(false);

    spawner.update(last);
    expect(spawner.done).toBe(true);

    spawner.restart(10_000);
    spawned = [];
    spawner.update(10_099);
    expect(spawner.done).toBe(false);
    expect(spawned).toHaveLength(0);

    spawner.update(10_100);
    expect(spawned).toHaveLength(3);
  });

  it("flies a drone in above the top edge when the scroll reaches it", () => {
    spawner.update(149);
    expect(watching).toHaveLength(0);

    spawner.update(150);
    expect(watching).toEqual([
      {
        def: level.eyes[1],
        pos: { x: 300, y: -EYE_STATS.drone.halfSize },
      },
    ]);
  });

  it("stands a tower on its anchor, entering as the ground under it does", () => {
    const anchor = anchorNear(level.terrain, "street", 600);
    const due = anchor.y - EYE_STATS.tower.halfSize;

    spawner.update(due - 1);
    expect(watching.map(({ def }) => def.type)).toEqual(["drone"]);

    spawner.update(due);
    expect(watching[1]).toEqual({
      def: level.eyes[0],
      pos: { x: anchor.x, y: -EYE_STATS.tower.halfSize },
    });
  });

  it("keeps a late tower pinned to its spot on the ground", () => {
    const anchor = anchorNear(level.terrain, "street", 600);

    spawner.update(anchor.y + 200);

    expect(watching[1].pos).toEqual({ x: anchor.x, y: 200 });
  });

  it("finds a tower's anchor again on every pass", () => {
    spawner.restart(5000);
    const anchor = anchorNear(level.terrain, "street", 5600);

    spawner.update(anchor.y);

    expect(watching.find(({ def }) => def.type === "tower")?.pos).toEqual({
      x: anchor.x,
      y: 0,
    });
  });
});
