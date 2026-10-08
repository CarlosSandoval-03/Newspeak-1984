import type p5 from "p5";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  SHADOW_ALPHA,
  SHADOW_OFFSET,
} from "../config";
import type { Vec } from "../types";

export abstract class Entity {
  pos: Vec;
  vel: Vec = { x: 0, y: 0 };
  radius: number;
  alive = true;

  constructor(pos: Vec, radius: number) {
    this.pos = { ...pos };
    this.radius = radius;
  }

  update(): void {
    this.pos.x += this.vel.x;
    this.pos.y += this.vel.y;
  }

  isOffscreen(margin: number): boolean {
    return (
      this.pos.x < -margin ||
      this.pos.x > CANVAS_WIDTH + margin ||
      this.pos.y < -margin ||
      this.pos.y > CANVAS_HEIGHT + margin
    );
  }

  abstract draw(p: p5): void;

  // Integer positions keep pixel art crisp; the shadow goes first so the aircraft covers it.
  // `turn` rotates a sprite drawn facing down; the shadow keeps its offset, since the sun doesn't turn.
  protected drawAircraft(
    p: p5,
    sprite: p5.Image,
    shadow: p5.Image,
    turn = 0,
  ): void {
    const x = Math.round(this.pos.x);
    const y = Math.round(this.pos.y);
    const context = p.drawingContext as CanvasRenderingContext2D;

    p.imageMode(p.CENTER);

    // globalAlpha instead of tint(): tint rebuilds the image on every call.
    context.globalAlpha = SHADOW_ALPHA;
    blit(p, shadow, x + SHADOW_OFFSET.x, y + SHADOW_OFFSET.y, turn);
    context.globalAlpha = 1;

    blit(p, sprite, x, y, turn);
  }
}

function blit(p: p5, image: p5.Image, x: number, y: number, turn: number) {
  if (turn === 0) {
    p.image(image, x, y);
    return;
  }

  p.push();
  p.translate(x, y);
  p.rotate(turn);
  p.image(image, 0, 0);
  p.pop();
}
