import type p5 from "p5";
import type { Assets } from "../assets";
import {
  CANVAS_HEIGHT,
  CONCRETE,
  ENEMY_BULLET_SPEED,
  HIT_FLASH_FRAMES,
  INK,
  PAPER,
  SCROLL_SPEED,
  TURRET_FIRE_INTERVAL,
  TURRET_STATS,
} from "../config";
import type { Vec } from "../types";
import { Bullet } from "./Bullet";
import { reloadDelay } from "./Enemy";
import { Entity } from "./Entity";

// Twin barrels from the turret's center, BARREL_GAP apart.
const BARREL_LENGTH = 18;
const BARREL_GAP = 6;
const BARREL_WIDTH = 3;
const MUZZLE_FRAMES = 2;
const MUZZLE_SIZE = 5;

export class Turret extends Entity {
  readonly score = TURRET_STATS.score;
  private hp = TURRET_STATS.hp;
  private flash = 0;
  private muzzle = 0;
  // Alternates, so each shot leaves from the other barrel.
  private barrel: -1 | 1 = -1;
  private fireTimer = reloadDelay(TURRET_FIRE_INTERVAL);
  private readonly target: () => Vec;
  private readonly images: Assets["image"];
  private readonly fire: (bullet: Bullet) => void;

  constructor(
    pos: Vec,
    target: () => Vec,
    images: Assets["image"],
    fire: (bullet: Bullet) => void,
  ) {
    super(pos, TURRET_STATS.radius);

    this.vel = { x: 0, y: SCROLL_SPEED };
    this.target = target;
    this.images = images;
    this.fire = fire;
  }

  get aim(): number {
    const target = this.target();
    return Math.atan2(target.y - this.pos.y, target.x - this.pos.x);
  }

  // The tip of one barrel: `side` picks the left or right one, seen down the barrels.
  tip(side: -1 | 1): Vec {
    const { aim } = this;
    const across = (side * BARREL_GAP) / 2;

    return {
      x: this.pos.x + Math.cos(aim) * BARREL_LENGTH - Math.sin(aim) * across,
      y: this.pos.y + Math.sin(aim) * BARREL_LENGTH + Math.cos(aim) * across,
    };
  }

  // True only for the hit that destroyed it, so two bullets on one tick score it once.
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
    super.update();
    if (this.flash > 0) this.flash--;
    if (this.muzzle > 0) this.muzzle--;

    if (this.pos.y - TURRET_STATS.halfSize > CANVAS_HEIGHT) {
      this.alive = false;
      return;
    }

    // The clock only runs on screen, so nothing shoots from beyond the top edge.
    if (this.pos.y < 0) return;
    if (--this.fireTimer > 0) return;

    const { aim } = this;
    this.fireTimer = reloadDelay(TURRET_FIRE_INTERVAL);
    this.muzzle = MUZZLE_FRAMES;
    this.fire(
      new Bullet("enemy", this.tip(this.barrel), {
        x: Math.cos(aim) * ENEMY_BULLET_SPEED,
        y: Math.sin(aim) * ENEMY_BULLET_SPEED,
      }),
    );
    this.barrel = this.barrel === -1 ? 1 : -1;
  }

  draw(p: p5): void {
    const sprite = this.flash > 0 ? "enemy-aa-gun-flash" : "enemy-aa-gun";
    const x = Math.round(this.pos.x);
    const y = Math.round(this.pos.y);

    p.imageMode(p.CENTER);
    p.image(this.images[sprite], x, y);

    // An ink line under a narrower concrete one gives each barrel its outline.
    for (const [color, weight] of [
      [INK, BARREL_WIDTH + 2],
      [CONCRETE, BARREL_WIDTH],
    ] as const) {
      p.stroke(color);
      p.strokeWeight(weight);
      for (const side of [-1, 1] as const) {
        const base = this.tip(side);
        const back = {
          x: base.x - Math.cos(this.aim) * BARREL_LENGTH,
          y: base.y - Math.sin(this.aim) * BARREL_LENGTH,
        };
        p.line(back.x, back.y, base.x, base.y);
      }
    }
    p.noStroke();

    // The flash is at the barrel that just fired, which is the other one by now.
    if (this.muzzle > 0) {
      const { x: mx, y: my } = this.tip(this.barrel === -1 ? 1 : -1);
      p.fill(PAPER);
      p.circle(mx, my, MUZZLE_SIZE);
    }
  }
}
