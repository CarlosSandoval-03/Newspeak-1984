import type p5 from "p5";
import {
  CANVAS_HEIGHT,
  CONCRETE,
  INK,
  PAPER,
  RED,
  STEEL,
  TELESCREEN_SHOW_FRAMES,
  TELESCREEN_SIZE,
  TELESCREEN_STATIC_FRAMES,
} from "../config";
import { lookToward } from "../core/math";
import type { Vec } from "../types";
import { drawPixelDisc, Entity } from "./Entity";

export type TelescreenShow = "static" | "eye" | "line";

const FRAME = 4;
const NOISE = 4;
const NOISE_SHADES = [INK, CONCRETE, STEEL, PAPER];
const SCLERA_RADIUS = 20;
const IRIS_RADIUS = 11;
const PUPIL_RADIUS = 6;
const PUPIL_TRAVEL = IRIS_RADIUS - PUPIL_RADIUS - 1;
const GLINT = { x: 2, y: -2 };
const TEXT_SIZE = 20;
const LINE_STEP = 24;

// A telescreen on a roof, facing the sky: part of the ground, it rides the city and touches nothing.
// It switches on to static, then shows the eye, which follows the plane, and its slogan in turn,
// every change passing through static.
export class Telescreen extends Entity {
  private readonly lines: readonly string[];
  private readonly font: p5.Font;
  private readonly target: () => Vec;
  private age = 0;

  constructor(pos: Vec, slogan: string, font: p5.Font, target: () => Vec) {
    super(pos, 0);
    this.lines = slogan.split("\n");
    this.font = font;
    this.target = target;
  }

  get showing(): TelescreenShow {
    const turn = TELESCREEN_STATIC_FRAMES + TELESCREEN_SHOW_FRAMES;
    if (this.age % turn < TELESCREEN_STATIC_FRAMES) return "static";
    return Math.floor(this.age / turn) % 2 === 0 ? "eye" : "line";
  }

  update(): void {
    super.update();
    this.age++;
    if (this.pos.y - TELESCREEN_SIZE.h / 2 > CANVAS_HEIGHT) this.alive = false;
  }

  // The red-lit frame around a dark screen, then whatever the screen shows.
  draw(p: p5): void {
    const { w, h } = TELESCREEN_SIZE;
    const center = { x: Math.round(this.pos.x), y: Math.round(this.pos.y) };

    p.noStroke();
    p.rectMode(p.CORNER);
    p.fill(RED);
    p.rect(center.x - w / 2, center.y - h / 2, w, h);
    p.fill(INK);
    p.rect(
      center.x - w / 2 + FRAME,
      center.y - h / 2 + FRAME,
      w - 2 * FRAME,
      h - 2 * FRAME,
    );

    const show = this.showing;
    if (show === "static") this.drawStatic(p, center);
    else if (show === "eye") this.drawEye(p, center);
    else this.drawLines(p, center);
  }

  // Random shades only change pixels, never the game, so they are drawn fresh each frame.
  private drawStatic(p: p5, center: Vec): void {
    const left = center.x - TELESCREEN_SIZE.w / 2 + FRAME;
    const top = center.y - TELESCREEN_SIZE.h / 2 + FRAME;

    for (let y = 0; y < TELESCREEN_SIZE.h - 2 * FRAME; y += NOISE)
      for (let x = 0; x < TELESCREEN_SIZE.w - 2 * FRAME; x += NOISE) {
        p.fill(NOISE_SHADES[Math.floor(Math.random() * NOISE_SHADES.length)]);
        p.rect(left + x, top + y, NOISE, NOISE);
      }
  }

  // The regime's eye, in its red, with its pupil turned toward the plane.
  private drawEye(p: p5, center: Vec): void {
    const look = lookToward(center, this.target(), PUPIL_TRAVEL);
    const pupil = { x: center.x + look.x, y: center.y + look.y };

    p.fill(PAPER);
    drawPixelDisc(p, center, SCLERA_RADIUS);
    p.fill(RED);
    drawPixelDisc(p, center, IRIS_RADIUS);
    p.fill(INK);
    drawPixelDisc(p, pupil, PUPIL_RADIUS);
    p.fill(PAPER);
    p.rect(pupil.x + GLINT.x, pupil.y + GLINT.y, 1, 1);
  }

  private drawLines(p: p5, center: Vec): void {
    const first = center.y - ((this.lines.length - 1) * LINE_STEP) / 2;

    p.textFont(this.font);
    p.textSize(TEXT_SIZE);
    p.textAlign(p.CENTER, p.CENTER);
    p.fill(PAPER);
    this.lines.forEach((line, i) =>
      p.text(line, center.x, first + i * LINE_STEP),
    );
  }
}
