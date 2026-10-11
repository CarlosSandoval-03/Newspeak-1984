import type p5 from "p5";
import type { Assets } from "../assets";
import {
  CANVAS_HEIGHT,
  DIARY_ALPHA,
  DIARY_HALF_SIZE,
  DIARY_RADIUS,
  SCROLL_SPEED,
} from "../config";
import type { Vec } from "../types";
import { Entity } from "./Entity";

// A page of the erased pilot's diary, left on a skylight: the one human object in the city, so it
// lies on the ground, dim and without a shadow, for the pilot to find.
export class Diary extends Entity {
  private readonly images: Assets["image"];

  constructor(pos: Vec, images: Assets["image"]) {
    super(pos, DIARY_RADIUS);
    this.vel = { x: 0, y: SCROLL_SPEED };
    this.images = images;
  }

  update(): void {
    super.update();
    if (this.pos.y - DIARY_HALF_SIZE > CANVAS_HEIGHT) this.alive = false;
  }

  draw(p: p5): void {
    const context = p.drawingContext as CanvasRenderingContext2D;

    p.imageMode(p.CENTER);
    context.globalAlpha = DIARY_ALPHA;
    p.image(this.images.diary, Math.round(this.pos.x), Math.round(this.pos.y));
    context.globalAlpha = 1;
  }
}
