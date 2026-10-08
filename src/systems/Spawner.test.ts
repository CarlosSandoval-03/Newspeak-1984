import { beforeEach, describe, expect, it } from "vitest";
import { ENEMY_STATS } from "../config";
import type { EnemyKind, LevelDef, Vec } from "../types";
import { Spawner } from "./Spawner";

const level: LevelDef = {
  terrain: { seed: 1, blocks: { plaza: 0, rubble: 0 } },
  waves: [
    { at: 100, kind: "straight", count: 3, x: 50, spacing: 40 },
    { at: 200, kind: "bomber", count: 1, x: 240, spacing: 0 },
    { at: 200, kind: "sine", count: 2, x: 100, spacing: 60 },
  ],
};

describe("Spawner", () => {
  let spawned: { kind: EnemyKind; pos: Vec }[];
  let spawner: Spawner;

  beforeEach(() => {
    spawned = [];
    spawner = new Spawner(level, (kind, pos) => spawned.push({ kind, pos }));
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

  it("is done after the last wave, and starts over on reset", () => {
    spawner.update(199);
    expect(spawner.done).toBe(false);

    spawner.update(200);
    expect(spawner.done).toBe(true);

    spawner.reset();
    spawned = [];
    spawner.update(100);
    expect(spawner.done).toBe(false);
    expect(spawned).toHaveLength(3);
  });
});
