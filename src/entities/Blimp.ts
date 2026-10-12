import type p5 from "p5";
import type { Assets } from "../assets";
import {
  BLIMP_DRIFT,
  BLIMP_SPEED,
  CANVAS_WIDTH,
  INK,
  PAPER,
  RED,
  SHADOW_ALPHA,
  SHADOW_OFFSET,
  TELL_FLICKER_FRAMES,
} from "../config";
import type { BlimpDef } from "../types";
import { Entity } from "./Entity";

// propaganda-blimp.png's length, nose to fins.
const HULL_LENGTH = 96;
const TOW_LENGTH = 24;
// Room for 22 characters of the machine's face, which advance 0.4 of its size.
const BANNER = { w: 192, h: 24 };
const BANNER_TRIM = 2;
const TEXT_SIZE = 20;
const BASELINE = 18;
const SWAY = 2;
const SWAY_FRAMES = 120;
// From the hull's middle to the far end of its banner.
const TRAIN_LENGTH = HULL_LENGTH / 2 + TOW_LENGTH + BANNER.w;

// The regime's voice in the sky: it crosses the screen once, towing a banner that says what
// Propaganda allows. It can't be shot and touches nothing.
export class Blimp extends Entity {
  private readonly heading: 1 | -1;
  private readonly slogan: () => string;
  private readonly sprite: p5.Image;
  private readonly shadow: p5.Image;
  private readonly font: p5.Font;
  private text: string;
  private flicker = 0;
  private age = 0;

  // Comes in nose first, its whole train still off the side it enters from.
  constructor(def: BlimpDef, slogan: () => string, assets: Assets) {
    const heading = def.from === "left" ? 1 : -1;
    const x = heading === 1 ? -HULL_LENGTH / 2 : CANVAS_WIDTH + HULL_LENGTH / 2;

    super({ x, y: def.y }, 0);
    this.heading = heading;
    this.vel = { x: heading * BLIMP_SPEED, y: BLIMP_DRIFT };
    this.slogan = slogan;
    this.text = slogan();
    this.sprite = assets.image["propaganda-blimp"];
    this.shadow = assets.image["propaganda-blimp-shadow"];
    this.font = assets.font.machine;
  }

  // Moves on, flickers for a moment when the record rewrites its banner (after the last flicker
  // has run, so a new one lasts its frames), and is gone once the banner's far end is past the
  // other side.
  update(): void {
    super.update();
    this.age++;

    if (this.flicker > 0) this.flicker--;
    const text = this.slogan();
    if (text !== this.text) {
      this.text = text;
      this.flicker = TELL_FLICKER_FRAMES;
    }

    const tail = this.pos.x - this.heading * TRAIN_LENGTH;
    if (this.heading === 1 ? tail > CANVAS_WIDTH : tail < 0) this.alive = false;
  }

  // The hull's shadow first, then the banner trailing behind on its line, then the hull over both.
  draw(p: p5): void {
    const x = Math.round(this.pos.x);
    const y = Math.round(this.pos.y);
    const context = p.drawingContext as CanvasRenderingContext2D;

    p.imageMode(p.CENTER);
    context.globalAlpha = SHADOW_ALPHA;
    this.drawFacing(p, this.shadow, x + SHADOW_OFFSET.x, y + SHADOW_OFFSET.y);
    context.globalAlpha = 1;

    this.drawBanner(p, x, y);
    this.drawFacing(p, this.sprite, x, y);
  }

  // The sprite flies right; mirrored, it flies left, and its shadow stays where the sun puts it.
  private drawFacing(p: p5, image: p5.Image, x: number, y: number): void {
    p.push();
    p.translate(x, y);
    p.scale(this.heading, 1);
    p.image(image, 0, 0);
    p.pop();
  }

  // Swaying a little on its tow line; for the tell, the cloth goes blank.
  private drawBanner(p: p5, x: number, y: number): void {
    const sway = Math.round(
      Math.sin((2 * Math.PI * this.age) / SWAY_FRAMES) * SWAY,
    );
    const tail = x - (this.heading * HULL_LENGTH) / 2;
    const near = tail - this.heading * TOW_LENGTH;
    const center = near - (this.heading * BANNER.w) / 2;
    const top = y + sway - BANNER.h / 2;

    p.stroke(INK);
    p.strokeWeight(1);
    p.line(tail, y, near, y + sway);

    p.stroke(RED);
    p.strokeWeight(BANNER_TRIM);
    p.fill(PAPER);
    p.rectMode(p.CORNER);
    p.rect(center - BANNER.w / 2, top, BANNER.w, BANNER.h);
    p.noStroke();
    if (this.flicker > 0) return;

    p.textFont(this.font);
    p.textSize(TEXT_SIZE);
    p.textAlign(p.CENTER, p.BASELINE);
    p.fill(INK);
    p.text(this.text, center, top + BASELINE);
  }
}
