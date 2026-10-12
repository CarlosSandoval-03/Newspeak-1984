import type p5 from "p5";
import { CANVAS_HEIGHT, GROUND_SLOGAN_SIZE, STEEL } from "../config";
import type { Vec } from "../types";
import { Entity } from "./Entity";

const TEXT_SIZE = 40;
const LINE_STEP = TEXT_SIZE * 1.2;

// A slogan painted on a plaza in huge letters, one word a line like a road marking: part of the
// ground, it rides the city and touches nothing.
export class GroundSlogan extends Entity {
  private readonly words: readonly string[];
  private readonly font: p5.Font;

  constructor(pos: Vec, slogan: string, font: p5.Font) {
    super(pos, 0);
    this.words = slogan.split(" ");
    this.font = font;
  }

  update(): void {
    super.update();
    if (this.pos.y - GROUND_SLOGAN_SIZE.h / 2 > CANVAS_HEIGHT)
      this.alive = false;
  }

  // The words stacked around the middle of the plaza.
  draw(p: p5): void {
    const x = Math.round(this.pos.x);
    const first = this.pos.y - ((this.words.length - 1) * LINE_STEP) / 2;

    p.noStroke();
    p.textFont(this.font);
    p.textSize(TEXT_SIZE);
    p.textAlign(p.CENTER, p.CENTER);
    p.fill(STEEL);
    this.words.forEach((word, i) =>
      p.text(word, x, Math.round(first + i * LINE_STEP)),
    );
  }
}
