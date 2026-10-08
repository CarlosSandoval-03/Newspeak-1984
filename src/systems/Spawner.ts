import { ENEMY_STATS } from "../config";
import type { EnemyKind, LevelDef, Vec } from "../types";

export class Spawner {
  private readonly level: LevelDef;
  private readonly spawn: (kind: EnemyKind, pos: Vec) => void;
  private next = 0;
  // The scroll at which the current pass began; the scroll itself never goes back, so the city never jumps.
  private start = 0;

  constructor(level: LevelDef, spawn: (kind: EnemyKind, pos: Vec) => void) {
    this.level = level;
    this.spawn = spawn;
  }

  get done(): boolean {
    return this.next >= this.level.waves.length;
  }

  // A loop, not an if: a big scroll step can pass several waves in one tick.
  update(scroll: number): void {
    const { waves } = this.level;

    while (
      this.next < waves.length &&
      scroll - this.start >= waves[this.next].at
    ) {
      const wave = waves[this.next++];
      const y = -ENEMY_STATS[wave.kind].halfSize;

      for (let i = 0; i < wave.count; i++)
        this.spawn(wave.kind, { x: wave.x + i * wave.spacing, y });
    }
  }

  restart(scroll: number): void {
    this.next = 0;
    this.start = scroll;
  }
}
