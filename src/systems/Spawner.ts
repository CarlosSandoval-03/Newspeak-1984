import { ENEMY_STATS, EYE_STATS } from "../config";
import { anchorNear } from "../levels/layout";
import type { EnemyKind, EyeDef, LevelDef, Vec } from "../types";

type Spawn = {
  enemy: (kind: EnemyKind, pos: Vec) => void;
  eye: (def: EyeDef, pos: Vec) => void;
};

// `ground` is the tower's level distance; a drone has none, since it flies.
type PendingEye = {
  def: EyeDef;
  due: number;
  x: number;
  ground: number | null;
};

export class Spawner {
  private readonly level: LevelDef;
  private readonly spawn: Spawn;
  private next = 0;
  private eyes: PendingEye[] = [];
  // The scroll at which the current pass began; the scroll itself never goes back, so the city never jumps.
  private start = 0;

  constructor(level: LevelDef, spawn: Spawn) {
    this.level = level;
    this.spawn = spawn;
    this.restart(0);
  }

  get done(): boolean {
    return this.next >= this.level.waves.length && this.eyes.length === 0;
  }

  // Loops, not ifs: a big scroll step can pass several waves in one tick.
  update(scroll: number): void {
    const { waves } = this.level;

    while (
      this.next < waves.length &&
      scroll - this.start >= waves[this.next].at
    ) {
      const wave = waves[this.next++];
      const y = -ENEMY_STATS[wave.kind].halfSize;

      for (let i = 0; i < wave.count; i++)
        this.spawn.enemy(wave.kind, { x: wave.x + i * wave.spacing, y });
    }

    while (this.eyes.length > 0 && scroll >= this.eyes[0].due) {
      const { def, x, ground } = this.eyes.shift()!;
      // A tower is pinned to its spot on the ground, wherever that is on screen by now.
      const y =
        ground === null ? -EYE_STATS[def.type].halfSize : scroll - ground;

      this.spawn.eye(def, { x, y });
    }
  }

  // Towers find their anchors again for the new pass, since the city under it is new.
  restart(scroll: number): void {
    const { terrain, eyes } = this.level;

    this.next = 0;
    this.start = scroll;
    this.eyes = eyes
      .map((def) => {
        const half = EYE_STATS[def.type].halfSize;
        if (def.type === "drone")
          return { def, due: scroll + def.at, x: def.x, ground: null };

        // Due as its sprite's top edge reaches the screen.
        const anchor = anchorNear(terrain, def.on, scroll + def.at);
        return { def, due: anchor.y - half, x: anchor.x, ground: anchor.y };
      })
      .sort((a, b) => a.due - b.due);
  }
}
