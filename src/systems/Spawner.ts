import {
  ALERT_SPAWN_MULT,
  CANVAS_WIDTH,
  DIARY_HALF_SIZE,
  ENEMY_STATS,
  EYE_STATS,
  GROUND_SLOGAN_SIZE,
  GYRO_INTERVAL,
  MURAL_SIZE,
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
  type BlimpDef,
  type LevelDef,
  type Vec,
  type WaveDef,
  type Word,
} from "../types";

type Spawn = {
  // `drops` is the word the enemy lets fall when shot down, if any.
  enemy: (
    kind: EnemyKind,
    pos: Vec,
    traits: { drops: Word | null; camo: boolean },
  ) => void;
  eye: (def: EyeDef, pos: Vec) => void;
  turret: (pos: Vec) => void;
  pickup: (word: Word, pos: Vec) => void;
  diary: (pos: Vec) => void;
  // `index` is a mural's, ground slogan's, or blimp's place in its level list, which picks its slogan.
  mural: (pos: Vec, index: number) => void;
  groundSlogan: (pos: Vec, index: number) => void;
  blimp: (def: BlimpDef, index: number) => void;
};

// Eyes, turrets, pickups, and the city's slogans come by scroll distance, not in waves; `place` gets the scroll they finally came at.
type Placement = { due: number; place: (scroll: number) => void };

export class Spawner {
  private readonly level: LevelDef;
  private readonly spawn: Spawn;
  private next = 0;
  private placements: Placement[];
  // Kept across dips out of pursuit, so hovering at the threshold can't call gyros faster.
  private nextGyro = -Infinity;
  // How far the waves have fallen behind the scroll while the Thought Police held them back.
  private delay = 0;
  private last = 0;

  constructor(level: LevelDef, spawn: Spawn) {
    this.level = level;
    this.spawn = spawn;
    this.placements = this.plan();
  }

  // One tick at this scroll: the waves' clock (held back while the Thought Police hold the sky, so
  // no wave is skipped), the waves now due, an autogyro in pursuit, and the ground and pickups now due.
  // The ground keeps coming even while held, since it is the city itself.
  update(scroll: number, alert: AlertLevel, held = false): void {
    if (held) this.delay += scroll - this.last;
    this.last = scroll;

    this.spawnWaves(scroll - this.delay, alert);
    // No autogyro joins while the Thought Police hold the sky: the fight is with them.
    if (!held && alert >= ALERT.pursuit) this.spawnGyro(scroll);
    this.placeDue(scroll);
  }

  // Loops, not ifs: a big scroll step can pass several waves in one tick.
  private spawnWaves(distance: number, alert: AlertLevel): void {
    const { waves } = this.level;

    while (this.next < waves.length && distance >= waves[this.next].at)
      this.spawnWave(waves[this.next++], alert);
  }

  // From alert up, reinforcements fly a row behind, over the first enemies' columns, so the wave
  // never runs off the screen's side or stacks two on one spot. The wave's word goes to its last enemy.
  private spawnWave(wave: WaveDef, alert: AlertLevel): void {
    const half = ENEMY_STATS[wave.kind].halfSize;
    const total =
      alert >= ALERT.alert
        ? Math.ceil(wave.count * ALERT_SPAWN_MULT)
        : wave.count;

    for (let i = 0; i < total; i++) {
      const row = Math.floor(i / wave.count);
      const column = i % wave.count;
      this.spawn.enemy(
        wave.kind,
        {
          x: wave.x + column * wave.spacing,
          y: -half - row * (half * 2 + REINFORCEMENT_GAP),
        },
        {
          drops: i === total - 1 ? (wave.drops ?? null) : null,
          camo: wave.camo ?? false,
        },
      );
    }
  }

  private spawnGyro(scroll: number): void {
    if (scroll < this.nextGyro) return;

    const half = ENEMY_STATS.homing.halfSize;
    this.nextGyro = scroll + GYRO_INTERVAL;
    this.spawn.enemy(
      "homing",
      { x: half + Math.random() * (CANVAS_WIDTH - half * 2), y: -half },
      { drops: null, camo: false },
    );
  }

  private placeDue(scroll: number): void {
    while (this.placements.length > 0 && scroll >= this.placements[0].due)
      this.placements.shift()!.place(scroll);
  }

  // Everything that comes by distance rather than in waves, in the order it is due.
  private plan(): Placement[] {
    const { eyes, turrets, pickups, diary, murals, groundSlogans, blimps } =
      this.level;

    return [
      // Drones fly in above the top edge; towers stand on the ground.
      ...eyes.map((def) =>
        def.type === "drone"
          ? this.inTheAir(
              def.at,
              { x: def.x, y: -EYE_STATS.drone.halfSize },
              (pos) => this.spawn.eye(def, pos),
            )
          : this.onGround(def, EYE_STATS.tower.halfSize, (pos) =>
              this.spawn.eye(def, pos),
            ),
      ),
      ...turrets.map((def) =>
        this.onGround(def, TURRET_STATS.halfSize, (pos) =>
          this.spawn.turret(pos),
        ),
      ),
      // Word cards fall in from above the top edge.
      ...pickups.map((def) =>
        this.inTheAir(def.at, { x: def.x, y: -PICKUP_RADIUS }, (pos) =>
          this.spawn.pickup(def.word, pos),
        ),
      ),
      // The diary lies on a skylight, so players learn where to look.
      this.onGround({ at: diary.at, on: "skylight" }, DIARY_HALF_SIZE, (pos) =>
        this.spawn.diary(pos),
      ),
      ...murals.map((def, index) =>
        this.onGround({ ...def, on: "mural" }, MURAL_SIZE.h / 2, (pos) =>
          this.spawn.mural(pos, index),
        ),
      ),
      ...groundSlogans.map((def, index) =>
        this.onGround(
          { ...def, on: "slogan" },
          GROUND_SLOGAN_SIZE.h / 2,
          (pos) => this.spawn.groundSlogan(pos, index),
        ),
      ),
      // A blimp flies in from the side, so its data holds where.
      ...blimps.map((def, index) => ({
        due: def.at,
        place: () => this.spawn.blimp(def, index),
      })),
    ].sort((a, b) => a.due - b.due);
  }

  private inTheAir(at: number, pos: Vec, spawn: (pos: Vec) => void): Placement {
    return { due: at, place: () => spawn(pos) };
  }

  // Due as its sprite's top edge reaches the screen, and pinned to its spot on the ground
  // wherever that is on screen by the time it comes.
  private onGround(
    def: { at: number; on: AnchorKind; x?: number },
    half: number,
    spawn: (pos: Vec) => void,
  ): Placement {
    const anchor = anchorNear(this.level, def.on, def.at, def.x);

    return {
      due: anchor.y - half,
      place: (scroll) => spawn({ x: anchor.x, y: scroll - anchor.y }),
    };
  }
}
