import type p5 from "p5";
import { BULLET_RADIUS, PAPER } from "../config";
import type { Vec } from "../types";
import { Entity } from "./Entity";

export type Owner = "player" | "enemy";

export class Bullet extends Entity {
  readonly owner: Owner;

  constructor(owner: Owner, pos: Vec, vel: Vec, radius = BULLET_RADIUS) {
    super(pos, radius);
    this.owner = owner;
    this.vel = vel;
  }

  update(): void {
    super.update();
    if (this.isOffscreen(this.radius)) this.alive = false;
  }

  draw(p: p5): void {
    p.noStroke();
    p.fill(PAPER);
    p.circle(Math.round(this.pos.x), Math.round(this.pos.y), this.radius * 2);
  }
}
