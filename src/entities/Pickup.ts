import type p5 from "p5";
import {
  CANVAS_HEIGHT,
  INK,
  PAPER,
  PICKUP_RADIUS,
  PICKUP_SPEED,
  RED,
  STEEL,
} from "../config";
import { t } from "../i18n";
import { state } from "../state";
import type { Vec, Word } from "../types";
import { Entity } from "./Entity";

const TEXT_SIZE = 20;
const STRIKE_WEIGHT = 2;

// A word falling from the sky: the power is the word itself, so it is drawn as text, not a sprite.
export class Pickup extends Entity {
  readonly word: Word;
  private readonly font: p5.Font;

  constructor(word: Word, pos: Vec, font: p5.Font) {
    super(pos, PICKUP_RADIUS);
    this.word = word;
    this.font = font;
    this.vel = { x: 0, y: PICKUP_SPEED };
  }

  update(): void {
    super.update();
    if (this.pos.y - PICKUP_RADIUS > CANVAS_HEIGHT) this.alive = false;
  }

  // Checked as it is drawn, so a word removed while it falls is struck out at once.
  draw(p: p5): void {
    const x = Math.round(this.pos.x);
    const y = Math.round(this.pos.y);
    const text = t(`words.${this.word}`);
    const removed = !state.words.has(this.word);

    p.noStroke();
    p.textFont(this.font);
    p.textSize(TEXT_SIZE);
    p.textAlign(p.CENTER, p.CENTER);
    // The ink shadow lets the word read over plazas and rooftops, as the HUD's text does.
    p.fill(INK);
    p.text(text, x + 1, y + 1);
    p.fill(removed ? STEEL : PAPER);
    p.text(text, x, y);

    if (removed) {
      const half = Math.ceil(p.textWidth(text) / 2) + 1;
      p.fill(RED);
      p.rect(x - half, y - 1, half * 2, STRIKE_WEIGHT);
    }
  }
}
