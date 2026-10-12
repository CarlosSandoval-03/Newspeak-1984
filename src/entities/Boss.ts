import type p5 from "p5";
import {
  BOSS_ENTRY_SPEED,
  BOSS_STATS,
  DAMAGE_END,
  ENEMY_BULLET_SPEED,
  INK,
  PAPER,
  RED,
} from "../config";
import { angleTo, fan, lookToward, radians, velocity } from "../core/math";
import type { BossDef, BossKind, Vec, VolleyDef } from "../types";
import type { BossDamage } from "./BossDamage";
import { Bullet } from "./Bullet";
import { Destructible } from "./Destructible";
import { type Arena, drawPixelDisc } from "./Entity";

type BossStats = Pick<BossDef, "halfSize" | "radius" | "hp" | "score">;

// The Eye's lens, from the sprite's center: its painted pupil is covered with iris, and a pupil
// drawn over it looks toward the pilot, as far as the iris leaves room for.
const LENS = { x: -1, y: 0 };
const IRIS_PATCH_RADIUS = 7;
const PUPIL_RADIUS = 5;
const PUPIL_TRAVEL = 3;
const GLINT = { x: 2, y: 2 };

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
// swaying along it, under the plane. It breaks hole by hole as its hp runs low.
export class LevelBoss extends Boss {
  readonly kind: BossKind;
  readonly def: BossDef;
  private readonly home: Vec;
  private readonly arena: Arena;
  private readonly damage: BossDamage;
  private inPlace = 0;
  private volley = 0;

  constructor(kind: BossKind, x: number, arena: Arena, damage: BossDamage) {
    const def = BOSS_STATS[kind];
    super({ x, y: -def.halfSize }, def);

    this.kind = kind;
    this.def = def;
    this.home = { x, y: def.hoverY };
    this.vel = { x: 0, y: BOSS_ENTRY_SPEED };
    this.arena = arena;
    this.damage = damage;
  }

  update(): void {
    super.update();
    if (this.entering) return;

    this.sway();
    const { interval, volleys } = this.phase();
    if (this.inPlace % interval === 0)
      this.shoot(volleys[this.volley++ % volleys.length]);
  }

  draw(p: p5): void {
    const { images } = this.arena;
    // The flash and the shadow follow the hull once it is a wreck, holes and all.
    const name =
      this.health <= DAMAGE_END
        ? (`boss-${this.kind}-damaged` as const)
        : (`boss-${this.kind}` as const);
    const sprite =
      this.flash > 0
        ? images[`${name}-flash`]
        : this.damage.sprite(this.health);

    // The ground has no height to cast a shadow from.
    if (this.def.ground) {
      p.imageMode(p.CENTER);
      p.image(sprite, Math.round(this.pos.x), Math.round(this.pos.y));
    } else this.drawAircraft(p, sprite, images[`${name}-shadow`]);

    // The flash whitens the whole hull, lens included.
    if (this.kind === "eye" && this.flash === 0) this.drawPupil(p);
  }

  // The painted pupil is patched over with iris, then the pupil is drawn shifted toward the pilot,
  // with its glint.
  private drawPupil(p: p5): void {
    const lens = {
      x: Math.round(this.pos.x) + LENS.x,
      y: Math.round(this.pos.y) + LENS.y,
    };
    const look = lookToward(lens, this.arena.target(), PUPIL_TRAVEL);
    const pupil = { x: lens.x + look.x, y: lens.y + look.y };

    p.noStroke();
    p.rectMode(p.CORNER);
    p.fill(RED);
    drawPixelDisc(p, lens, IRIS_PATCH_RADIUS);
    p.fill(INK);
    drawPixelDisc(p, pupil, PUPIL_RADIUS);
    p.fill(PAPER);
    p.rect(pupil.x + GLINT.x, pupil.y + GLINT.y, 1, 1);
  }

  // Only until it first reaches its place: a ground boss later sways above it, along its street.
  private get entering(): boolean {
    return this.inPlace === 0 && this.pos.y < this.home.y;
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
