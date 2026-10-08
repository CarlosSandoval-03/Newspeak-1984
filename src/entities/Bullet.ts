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
    const x = Math.round(this.pos.x);
    const y = Math.round(this.pos.y);

    p.noStroke();
    p.fill(PAPER);

    if (this.owner === "enemy") {
      p.circle(x, y, this.radius * 2);
      return;
    }

    // A 5×9 tracer, pointed at both ends, so the player's own fire never reads as an enemy's.
    p.rect(x - 2, y - 2, 5, 5);
    p.rect(x - 1, y - 3, 3, 7);
    p.rect(x, y - 4, 1, 9);
  }
}
