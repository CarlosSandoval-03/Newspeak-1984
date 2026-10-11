import type p5 from "p5";
import type { Assets } from "../assets";
import {
  BOSS_ENTRY_SPEED,
  BOSS_STATS,
  ENEMY_BULLET_SPEED,
  HIT_FLASH_FRAMES,
} from "../config";
import type { BossDef, BossKind, Vec, VolleyDef } from "../types";
import { Bullet } from "./Bullet";
import { Entity } from "./Entity";

// Shared by the Thought Police and every level boss: hp, its bar, and the hit flash.
export abstract class Boss extends Entity {
  readonly score: number;
  private readonly maxHp: number;
  private hp: number;
  protected age = 0;
  protected flash = 0;

  constructor(pos: Vec, radius: number, hp: number, score: number) {
    super(pos, radius);
    this.maxHp = hp;
    this.hp = hp;
    this.score = score;
  }

  // What the hp bar shows, from 1 down to 0.
  get health(): number {
    return this.hp / this.maxHp;
  }

  // True only for the hit that destroyed it, so two bullets on one tick count it once.
  hit(damage = 1): boolean {
    if (!this.alive) return false;

    this.hp -= damage;
    if (this.hp <= 0) {
      this.alive = false;
      return true;
    }

    this.flash = HIT_FLASH_FRAMES;
    return false;
  }

  update(): void {
    this.age++;
    super.update();
    if (this.flash > 0) this.flash--;
  }
}

const radians = (degrees: number) => (degrees * Math.PI) / 180;

// Any level's boss, run from its data: it comes down to `hoverY` above `x`, then sways and fires its
// current phase's volleys in turn. An air boss sways across the sky; a ground boss rides its street,
// swaying along it, under the plane.
export class LevelBoss extends Boss {
  readonly kind: BossKind;
  readonly def: BossDef;
  private readonly home: Vec;
  private readonly target: () => Vec;
  private readonly images: Assets["image"];
  private readonly fire: (bullet: Bullet) => void;
  private inPlace = 0;
  private volley = 0;

  constructor(
    kind: BossKind,
    x: number,
    target: () => Vec,
    images: Assets["image"],
    fire: (bullet: Bullet) => void,
  ) {
    const def = BOSS_STATS[kind];
    super({ x, y: -def.halfSize }, def.radius, def.hp, def.score);

    this.kind = kind;
    this.def = def;
    this.home = { x, y: def.hoverY };
    this.vel = { x: 0, y: BOSS_ENTRY_SPEED };
    this.target = target;
    this.images = images;
    this.fire = fire;
  }

  update(): void {
    super.update();
    if (this.pos.y < this.home.y) return;

    const { sway, ground } = this.def;
    const offset =
      sway.amp * Math.sin((2 * Math.PI * this.inPlace++) / sway.period);
    this.vel = { x: 0, y: 0 };
    this.pos = ground
      ? { x: this.home.x, y: this.home.y + offset }
      : { x: this.home.x + offset, y: this.home.y };

    const { interval, volleys } = this.phase();
    if (this.inPlace % interval === 0)
      this.shoot(volleys[this.volley++ % volleys.length]);
  }

  draw(p: p5): void {
    const name = `boss-${this.kind}` as const;
    const sprite =
      this.flash > 0 ? this.images[`${name}-flash`] : this.images[name];

    // The ground has no height to cast a shadow from.
    if (this.def.ground) {
      p.imageMode(p.CENTER);
      p.image(sprite, Math.round(this.pos.x), Math.round(this.pos.y));
    } else this.drawAircraft(p, sprite, this.images[`${name}-shadow`]);
  }

  // The last phase whose threshold the hp has fallen to.
  private phase() {
    const { phases } = this.def;
    return phases.findLast((phase) => this.health <= phase.from) ?? phases[0];
  }

  private shoot({ aim, count, spread }: VolleyDef): void {
    const target = this.target();
    const center =
      aim === "player"
        ? Math.atan2(target.y - this.pos.y, target.x - this.pos.x)
        : Math.PI / 2;
    const width = radians(spread);
    const step = count > 1 ? width / (count - 1) : 0;

    for (let i = 0; i < count; i++) {
      const angle = center - (count > 1 ? width / 2 : 0) + i * step;
      this.fire(
        new Bullet(this.def.regime ? "regime" : "enemy", this.pos, {
          x: Math.cos(angle) * ENEMY_BULLET_SPEED,
          y: Math.sin(angle) * ENEMY_BULLET_SPEED,
        }),
      );
    }
  }
}
