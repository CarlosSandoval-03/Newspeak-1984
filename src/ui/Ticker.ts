import type p5 from "p5";
import {
  CANVAS_WIDTH,
  PAPER,
  RED_DARK,
  TELL_FLICKER_FRAMES,
  TICKER_SPEED,
} from "../config";
import { currentStrings, format } from "../i18n";
import type { Propaganda } from "../systems/Propaganda";
import type { Enemy } from "../types";

// The dark-red strip along the bottom edge; text in the machine's face, whose glyphs all advance
// 0.4 of its size, so a line's width is known without measuring it.
const STRIP = { y: 616, h: 24 };
const BASELINE = 634;
const TEXT_SIZE = 20;
const CHAR_WIDTH = TEXT_SIZE * 0.4;
const GAP = 48;

// A line as written: its template, its own values, and the enemy at the time of writing.
interface News {
  template: string;
  params: Record<string, string | number>;
  enemy: Enemy;
}

interface Item {
  news: News;
  x: number;
}

// The regime's news, scrolling left: the level's lines in turn, with anything announced cutting in
// ahead of them. Every line names the enemy Propaganda allows, so when the war changes sides the
// lines already out are rewritten in place.
export class Ticker {
  private readonly propaganda: Propaganda;
  private readonly feed: readonly string[];
  private readonly urgent: News[] = [];
  private items: Item[] = [];
  private next = 0;
  private enemy: Enemy;
  private flicker = 0;

  constructor(propaganda: Propaganda, level: number) {
    const { common, byLevel } = currentStrings().ticker;

    this.propaganda = propaganda;
    this.feed = [...byLevel[level - 1], ...common];
    this.enemy = propaganda.enemy;
  }

  announce(template: string, params: News["params"] = {}): void {
    this.urgent.push({ template, params, enemy: this.propaganda.enemy });
  }

  // The war's change of sides is announced first, after the last flicker has run, so a new one
  // lasts its frames; then the tape moves on, drops what has left the strip, and feeds the next line
  // in once there is room behind the last.
  update(): void {
    if (this.flicker > 0) this.flicker--;
    this.noticeFlip();

    for (const item of this.items) item.x -= TICKER_SPEED;
    this.items = this.items.filter(({ news, x }) => x + this.width(news) > 0);
    this.feedIn();
  }

  draw(p: p5, font: p5.Font): void {
    p.noStroke();
    p.fill(RED_DARK);
    p.rect(0, STRIP.y, CANVAS_WIDTH, STRIP.h);
    // The tell: for a moment the rewritten record goes blank.
    if (this.flicker > 0) return;

    p.textFont(font);
    p.textSize(TEXT_SIZE);
    p.textAlign(p.LEFT, p.BASELINE);
    p.fill(PAPER);
    for (const { news, x } of this.items)
      p.text(this.text(news), Math.round(x), BASELINE);
  }

  // When the war changes sides, the record says so once, and flickers as it rewrites itself.
  private noticeFlip(): void {
    const { enemy } = this.propaganda;
    if (enemy === this.enemy) return;

    this.enemy = enemy;
    this.flicker = TELL_FLICKER_FRAMES;
    this.announce(currentStrings().ticker.flip);
  }

  // Each line enters at the right edge as soon as the one before it leaves a gap behind.
  private feedIn(): void {
    const last = this.items.at(-1);
    const free = last ? last.x + this.width(last.news) + GAP : CANVAS_WIDTH;
    if (free > CANVAS_WIDTH) return;

    this.items.push({ news: this.nextNews(), x: CANVAS_WIDTH });
  }

  private nextNews(): News {
    const urgent = this.urgent.shift();
    if (urgent) return urgent;

    const template = this.feed[this.next++ % this.feed.length];
    return { template, params: {}, enemy: this.propaganda.enemy };
  }

  private text({ template, params, enemy }: News): string {
    const { enemies } = currentStrings().ticker;
    return format(template, {
      ...params,
      enemy: enemies[this.propaganda.displayedEnemy(enemy)],
    });
  }

  private width(news: News): number {
    return this.text(news).length * CHAR_WIDTH;
  }
}
