import type p5 from "p5";
import {
  CANVAS_HEIGHT,
  CONCRETE,
  ENEMY_BULLET_SPEED,
  INK,
  PAPER,
  SCROLL_SPEED,
  TURRET_FIRE_INTERVAL,
  TURRET_STATS,
} from "../config";
import { angleTo, velocity } from "../core/math";
import type { Vec } from "../types";
import { Bullet } from "./Bullet";
import { Destructible } from "./Destructible";
import { reloadDelay } from "./Enemy";
import type { Arena } from "./Entity";

// Twin barrels from the turret's center, BARREL_GAP apart.
const BARREL_LENGTH = 18;
const BARREL_GAP = 6;
const BARREL_WIDTH = 3;
const MUZZLE_FRAMES = 2;
const MUZZLE_SIZE = 5;

export class Turret extends Destructible {
  readonly score = TURRET_STATS.score;
  private muzzle = 0;
  // Alternates, so each shot leaves from the other barrel.
  private barrel: -1 | 1 = -1;
  private fireTimer = reloadDelay(TURRET_FIRE_INTERVAL);
  private readonly arena: Arena;

  constructor(pos: Vec, arena: Arena) {
    super(pos, TURRET_STATS.radius, TURRET_STATS.hp);

    this.vel = { x: 0, y: SCROLL_SPEED };
    this.arena = arena;
  }

  get aim(): number {
    return angleTo(this.pos, this.arena.target());
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

  update(): void {
    super.update();
    if (this.muzzle > 0) this.muzzle--;

    if (this.pos.y - TURRET_STATS.halfSize > CANVAS_HEIGHT) {
      this.alive = false;
      return;
    }
    this.reload();
  }

  draw(p: p5): void {
    const sprite = this.flash > 0 ? "enemy-aa-gun-flash" : "enemy-aa-gun";

    p.imageMode(p.CENTER);
    p.image(
      this.arena.images[sprite],
      Math.round(this.pos.x),
      Math.round(this.pos.y),
    );
    this.drawBarrels(p);
    if (this.muzzle > 0) this.drawMuzzleFlash(p);
  }

  // The clock only runs on screen, so nothing shoots from beyond the top edge.
  private reload(): void {
    if (this.pos.y < 0 || --this.fireTimer > 0) return;

    this.fireTimer = reloadDelay(TURRET_FIRE_INTERVAL);
    this.muzzle = MUZZLE_FRAMES;
    this.arena.fire(
      new Bullet(
        "enemy",
        this.tip(this.barrel),
        velocity(this.aim, ENEMY_BULLET_SPEED),
      ),
    );
    this.barrel = this.barrel === -1 ? 1 : -1;
  }

  // An ink line under a narrower concrete one gives each barrel its outline.
  private drawBarrels(p: p5): void {
    for (const [color, weight] of [
      [INK, BARREL_WIDTH + 2],
      [CONCRETE, BARREL_WIDTH],
    ] as const) {
      p.stroke(color);
      p.strokeWeight(weight);
      for (const side of [-1, 1] as const) {
        const tip = this.tip(side);
        p.line(
          tip.x - Math.cos(this.aim) * BARREL_LENGTH,
          tip.y - Math.sin(this.aim) * BARREL_LENGTH,
          tip.x,
          tip.y,
        );
      }
    }
    p.noStroke();
  }

  // At the barrel that just fired, which is the other one by now.
  private drawMuzzleFlash(p: p5): void {
    const { x, y } = this.tip(this.barrel === -1 ? 1 : -1);

    p.fill(PAPER);
    p.circle(x, y, MUZZLE_SIZE);
  }
}
