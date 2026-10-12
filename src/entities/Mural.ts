import type p5 from "p5";
import type { Assets } from "../assets";
import { CANVAS_HEIGHT, INK, MURAL_SIZE, PAPER, RED } from "../config";
import type { Vec } from "../types";
import { Entity } from "./Entity";

// The portrait sits in a red field at the top; the slogan's two lines on an ink band below it.
const FRAME = 4;
const BAND_TOP = 72;
const TEXT_SIZE = 10;
const LINE_STEP = 12;
const FIRST_BASELINE = 84;

// The Leader's portrait painted on a roof, for the sky to read: part of the ground, it rides the
// city and touches nothing.
export class Mural extends Entity {
  private readonly lines: readonly string[];
  private readonly image: Assets["image"]["poster-leader"];
  private readonly font: p5.Font;

  constructor(pos: Vec, slogan: string, assets: Assets) {
    super(pos, 0);
    this.lines = slogan.split("\n");
    this.image = assets.image["poster-leader"];
    this.font = assets.font.machine;
  }

  update(): void {
    super.update();
    if (this.pos.y - MURAL_SIZE.h / 2 > CANVAS_HEIGHT) this.alive = false;
  }

  // The red field with the portrait, then the ink band with the slogan centered on it.
  draw(p: p5): void {
    const left = Math.round(this.pos.x - MURAL_SIZE.w / 2);
    const top = Math.round(this.pos.y - MURAL_SIZE.h / 2);
    const center = left + MURAL_SIZE.w / 2;

    p.noStroke();
    p.fill(RED);
    p.rect(left, top, MURAL_SIZE.w, BAND_TOP);
    p.imageMode(p.CORNER);
    p.image(this.image, center - this.image.width / 2, top + FRAME);

    p.fill(INK);
    p.rect(left, top + BAND_TOP, MURAL_SIZE.w, MURAL_SIZE.h - BAND_TOP);
    p.textFont(this.font);
    p.textSize(TEXT_SIZE);
    p.textAlign(p.CENTER, p.BASELINE);
    p.fill(PAPER);
    this.lines.forEach((line, i) =>
      p.text(line, center, top + FIRST_BASELINE + i * LINE_STEP),
    );
  }
}
