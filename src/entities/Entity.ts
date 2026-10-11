import type p5 from "p5";
import type { Assets } from "../assets";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  SHADOW_ALPHA,
  SHADOW_OFFSET,
} from "../config";
import type { Vec } from "../types";
import type { Bullet } from "./Bullet";

// What a hostile needs from the scene: its sprites, a hand to fire through, and the pilot to aim at.
export interface Arena {
  readonly images: Assets["image"];
  readonly fire: (bullet: Bullet) => void;
  readonly target: () => Vec;
}

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
  // `alpha` fades the aircraft and its shadow together. Pixel art can't grow with `altitude`, so the shadow
  // shows it: 0 on the ground, under the aircraft, and 1 in flight; above that it drifts further and fades.
  protected drawAircraft(
    p: p5,
    sprite: p5.Image,
    shadow: p5.Image,
    turn = 0,
    alpha = 1,
    altitude = 1,
  ): void {
    const x = Math.round(this.pos.x);
    const y = Math.round(this.pos.y);
    const context = p.drawingContext as CanvasRenderingContext2D;

    p.imageMode(p.CENTER);

    // globalAlpha instead of tint(): tint rebuilds the image on every call.
    context.globalAlpha = (SHADOW_ALPHA * alpha) / Math.max(1, altitude);
    blit(
      p,
      shadow,
      x + Math.round(SHADOW_OFFSET.x * altitude),
      y + Math.round(SHADOW_OFFSET.y * altitude),
      turn,
    );
    context.globalAlpha = alpha;
    blit(p, sprite, x, y, turn);
    context.globalAlpha = 1;
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
