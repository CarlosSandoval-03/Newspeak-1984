import type p5 from "p5";
import {
  CANVAS_HEIGHT,
  INK,
  PAPER,
  PICKUP_RADIUS,
  PICKUP_SPEED,
  RED,
  SHADOW_ALPHA,
  SHADOW_OFFSET,
  STEEL,
} from "../config";
import { t } from "../i18n";
import { state } from "../state";
import type { Vec, Word } from "../types";
import { Entity } from "./Entity";

const TEXT_SIZE = 20;
const STRIKE_WEIGHT = 2;
const CARD_PADDING = 5;
const CARD_HEIGHT = 18;

// A word falling from the sky on a dictionary card: the power is the word itself, so it is drawn
// as text, not a sprite.
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
    const textWidth = Math.ceil(p.textWidth(text));
    const w = textWidth + CARD_PADDING * 2;
    const left = x - Math.round(w / 2);
    const top = y - Math.round(CARD_HEIGHT / 2);
    const context = p.drawingContext as CanvasRenderingContext2D;

    // Cast like an aircraft's, so the card reads as falling through the air, not painted on the ground.
    context.globalAlpha = SHADOW_ALPHA;
    p.fill(INK);
    p.rect(left + SHADOW_OFFSET.x, top + SHADOW_OFFSET.y, w, CARD_HEIGHT);
    context.globalAlpha = 1;

    // A slip of paper, the brightest thing in the sky; a removed word's card is dulled to steel.
    p.fill(INK);
    p.rect(left - 1, top - 1, w + 2, CARD_HEIGHT + 2);
    p.fill(removed ? STEEL : PAPER);
    p.rect(left, top, w, CARD_HEIGHT);
    p.fill(INK);
    p.text(text, x, y - 1);

    if (removed) {
      const half = Math.ceil(textWidth / 2) + 1;
      p.fill(RED);
      p.rect(x - half, y - 1, half * 2, STRIKE_WEIGHT);
    }
  }
}
