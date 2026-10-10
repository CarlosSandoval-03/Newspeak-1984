import {
  ALERT_SPAWN_MULT,
  CANVAS_WIDTH,
  ENEMY_STATS,
  EYE_STATS,
  GYRO_INTERVAL,
  PICKUP_RADIUS,
  REINFORCEMENT_GAP,
  TURRET_STATS,
} from "../config";
import { anchorNear } from "../levels/layout";
import {
  ALERT,
  type AlertLevel,
  type EnemyKind,
  type EyeDef,
  type AnchorKind,
  type LevelDef,
  type Vec,
  type Word,
} from "../types";

type Spawn = {
  // `drops` is the word the enemy lets fall when shot down, if any.
  enemy: (kind: EnemyKind, pos: Vec, drops: Word | null) => void;
  eye: (def: EyeDef, pos: Vec) => void;
  turret: (pos: Vec) => void;
  pickup: (word: Word, pos: Vec) => void;
};

// Eyes, turrets, and pickups come by scroll distance, not in waves; `place` gets the scroll they finally came at.
type Placement = { due: number; place: (scroll: number) => void };

export class Spawner {
  private readonly level: LevelDef;
  private readonly spawn: Spawn;
  private next = 0;
  private placements: Placement[] = [];
  // Kept across passes and dips out of pursuit, so hovering at the threshold can't call gyros faster.
  private nextGyro = -Infinity;
  // The scroll at which the current pass began; the scroll itself never goes back, so the city never jumps.
  private start = 0;
  private last = 0;

  constructor(level: LevelDef, spawn: Spawn) {
    this.level = level;
    this.spawn = spawn;
    this.restart(0);
  }

  get done(): boolean {
    return this.next >= this.level.waves.length && this.placements.length === 0;
  }

  // Loops, not ifs: a big scroll step can pass several waves in one tick.
  // While `held` (the Thought Police hold the sky) the waves' clock stops, so none is skipped, and no
  // autogyro comes: the fight is with them. The ground keeps coming, since it is the city itself.
  update(scroll: number, alert: AlertLevel, held = false): void {
    const { waves } = this.level;

    if (held) this.start += scroll - this.last;
    this.last = scroll;

    while (
      this.next < waves.length &&
      scroll - this.start >= waves[this.next].at
    ) {
      const wave = waves[this.next++];
      const half = ENEMY_STATS[wave.kind].halfSize;
      const total =
        alert >= ALERT.alert
          ? Math.ceil(wave.count * ALERT_SPAWN_MULT)
          : wave.count;

      // Reinforcements fly a row behind, over the first enemies' columns,
      // so the wave never runs off the screen's side or stacks two on one spot.
      for (let i = 0; i < total; i++) {
        const row = Math.floor(i / wave.count);
        const column = i % wave.count;
        this.spawn.enemy(
          wave.kind,
          {
            x: wave.x + column * wave.spacing,
            y: -half - row * (half * 2 + REINFORCEMENT_GAP),
          },
          i === total - 1 ? (wave.drops ?? null) : null,
        );
      }
    }

    if (!held && alert >= ALERT.pursuit && scroll >= this.nextGyro) {
      const half = ENEMY_STATS.homing.halfSize;

      this.nextGyro = scroll + GYRO_INTERVAL;
      this.spawn.enemy(
        "homing",
        { x: half + Math.random() * (CANVAS_WIDTH - half * 2), y: -half },
        null,
      );
    }

    while (this.placements.length > 0 && scroll >= this.placements[0].due)
      this.placements.shift()!.place(scroll);
  }

  // Ground elements find their anchors again for the new pass, since the city under it is new.
  restart(scroll: number): void {
    const { eyes, turrets, pickups } = this.level;

    this.next = 0;
    this.start = scroll;
    this.last = scroll;
    this.placements = [
      ...eyes.map((def) =>
        def.type === "drone"
          ? {
              due: scroll + def.at,
              place: () =>
                this.spawn.eye(def, {
                  x: def.x,
                  y: -EYE_STATS.drone.halfSize,
                }),
            }
          : this.onGround(def, scroll, EYE_STATS.tower.halfSize, (pos) =>
              this.spawn.eye(def, pos),
            ),
      ),
      ...turrets.map((def) =>
        this.onGround(def, scroll, TURRET_STATS.halfSize, (pos) =>
          this.spawn.turret(pos),
        ),
      ),
      ...pickups.map((def) => ({
        due: scroll + def.at,
        place: () =>
          this.spawn.pickup(def.word, { x: def.x, y: -PICKUP_RADIUS }),
      })),
    ].sort((a, b) => a.due - b.due);
  }

  // Due as its sprite's top edge reaches the screen, and pinned to its spot on the ground
  // wherever that is on screen by the time it comes.
  private onGround(
    def: { at: number; on: AnchorKind; x?: number },
    start: number,
    half: number,
    spawn: (pos: Vec) => void,
  ): Placement {
    const anchor = anchorNear(
      this.level.terrain,
      def.on,
      start + def.at,
      def.x,
    );

    return {
      due: anchor.y - half,
      place: (scroll) => spawn({ x: anchor.x, y: scroll - anchor.y }),
    };
  }
}
