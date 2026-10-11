import type p5 from "p5";
import { BOSS_ENTRY_SPEED, BOSS_STATS, ENEMY_BULLET_SPEED } from "../config";
import { angleTo, fan, radians, velocity } from "../core/math";
import type { BossDef, BossKind, Vec, VolleyDef } from "../types";
import { Bullet } from "./Bullet";
import { Destructible } from "./Destructible";
import type { Arena } from "./Entity";

type BossStats = Pick<BossDef, "halfSize" | "radius" | "hp" | "score">;

// Shared by the Thought Police and every level boss: a score, a clock, and an hp bar to show.
export abstract class Boss extends Destructible {
  readonly score: number;
  readonly halfSize: number;
  protected age = 0;

  constructor(pos: Vec, { halfSize, radius, hp, score }: BossStats) {
    super(pos, radius, hp);
    this.score = score;
    this.halfSize = halfSize;
  }

  update(): void {
    this.age++;
    super.update();
  }
}

// Any level's boss, run from its data: it comes down to `hoverY` above `x`, then sways and fires its
// current phase's volleys in turn. An air boss sways across the sky; a ground boss rides its street,
// swaying along it, under the plane.
export class LevelBoss extends Boss {
  readonly kind: BossKind;
  readonly def: BossDef;
  private readonly home: Vec;
  private readonly arena: Arena;
  private inPlace = 0;
  private volley = 0;

  constructor(kind: BossKind, x: number, arena: Arena) {
    const def = BOSS_STATS[kind];
    super({ x, y: -def.halfSize }, def);

    this.kind = kind;
    this.def = def;
    this.home = { x, y: def.hoverY };
    this.vel = { x: 0, y: BOSS_ENTRY_SPEED };
    this.arena = arena;
  }

  update(): void {
    super.update();
    if (this.pos.y < this.home.y) return;

    this.sway();
    const { interval, volleys } = this.phase();
    if (this.inPlace % interval === 0)
      this.shoot(volleys[this.volley++ % volleys.length]);
  }

  draw(p: p5): void {
    const { images } = this.arena;
    const name = `boss-${this.kind}` as const;
    const sprite = this.flash > 0 ? images[`${name}-flash`] : images[name];

    // The ground has no height to cast a shadow from.
    if (this.def.ground) {
      p.imageMode(p.CENTER);
      p.image(sprite, Math.round(this.pos.x), Math.round(this.pos.y));
    } else this.drawAircraft(p, sprite, images[`${name}-shadow`]);
  }

  private sway(): void {
    const { sway, ground } = this.def;
    const offset =
      sway.amp * Math.sin((2 * Math.PI * this.inPlace++) / sway.period);

    this.vel = { x: 0, y: 0 };
    this.pos = ground
      ? { x: this.home.x, y: this.home.y + offset }
      : { x: this.home.x + offset, y: this.home.y };
  }

  // The last phase whose threshold the hp has fallen to.
  private phase() {
    const { phases } = this.def;
    return phases.findLast((phase) => this.health <= phase.from) ?? phases[0];
  }

  private shoot({ aim, count, spread }: VolleyDef): void {
    const center =
      aim === "player" ? angleTo(this.pos, this.arena.target()) : Math.PI / 2;
    const owner = this.def.regime ? "regime" : "enemy";

    for (const angle of fan(center, count, radians(spread)))
      this.arena.fire(
        new Bullet(owner, this.pos, velocity(angle, ENEMY_BULLET_SPEED)),
      );
  }
}
