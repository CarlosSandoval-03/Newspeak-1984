import type p5 from "p5";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  CURSOR_BLINK_FRAMES,
  PAPER,
  RED,
  TYPEWRITER_CPF,
  VIGNETTE_ALPHA,
  VIGNETTE_FADE_FRAMES,
  VIGNETTE_PULSE_FRAMES,
} from "../config";
import type { Vec } from "../types";

const LINE_HEIGHT = 1.2;
const SCORE_DIGITS = 6;
// Through the middle of the capitals.
const STRIKE_RISE = 0.3;
const STRIKE_WEIGHT = 2;
// Pressed by hand, never square; the box is sized from the word's own size.
const STAMP_ANGLE = -0.14;
const STAMP_PADDING = 0.3;
const STAMP_HEIGHT = 1.4;
const STAMP_WEIGHT = 3;

// A line of a typed page, in its own place and size.
export interface PageLine {
  text: string;
  x: number;
  y: number;
  size: number;
}

// Types a page, line after line, a few characters a frame; `finish()` is Enter, revealing the rest.
// It only counts characters: the scene draws them, so each line keeps its own font and place.
export class Typewriter {
  private readonly lines: readonly string[];
  private readonly total: number;
  private readonly cpf: number;
  private typed = 0;
  private age = 0;

  constructor(lines: readonly string[], cpf = TYPEWRITER_CPF) {
    this.lines = lines;
    this.cpf = cpf;
    this.total = lines.reduce((sum, line) => sum + line.length, 0);
  }

  get done(): boolean {
    return this.typed >= this.total;
  }

  // The line the carriage is on, and how far along it: the first line not typed in full, or the
  // end of the last one once the page is done.
  get cursor(): { line: number; column: number } {
    const line = this.lines.findIndex(
      (_, i) => this.shown(i).length < this.lines[i].length,
    );
    const at = line === -1 ? this.lines.length - 1 : line;
    return { line: at, column: this.shown(at).length };
  }

  get cursorVisible(): boolean {
    return Math.floor(this.age / CURSOR_BLINK_FRAMES) % 2 === 0;
  }

  update(): void {
    this.age++;
    this.typed = Math.min(this.total, this.typed + this.cpf);
  }

  finish(): void {
    this.typed = this.total;
  }

  // What of a line is on the page so far.
  shown(line: number): string {
    const start = this.lines
      .slice(0, line)
      .reduce((sum, text) => sum + text.length, 0);
    return this.lines[line].slice(
      0,
      Math.max(0, Math.floor(this.typed) - start),
    );
  }

  // Whether a line has been typed in full, so what follows it, like a strike-through, can begin.
  typedLine(line: number): boolean {
    return this.shown(line).length === this.lines[line].length;
  }
}

// Breaks prose into lines of at most `columns` characters, at spaces. Both fonts are monospaced,
// so a line's width is its length.
export function wrap(text: string, columns: number): string[] {
  const lines: string[] = [];
  let line = "";

  for (const word of text.split(" ")) {
    if (line && line.length + 1 + word.length > columns) {
      lines.push(line);
      line = word;
    } else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  return lines;
}

// Lines stacked down from (x, y), each as tall as its size and the line height.
export function stack(
  texts: readonly string[],
  { x, y, size }: Omit<PageLine, "text">,
): PageLine[] {
  return texts.map((text, i) => ({
    text,
    x,
    y: Math.round(y + i * size * LINE_HEIGHT),
    size,
  }));
}

export function scoreDigits(score: number): string {
  return String(score).padStart(SCORE_DIGITS, "0");
}

// A one-character block where the typewriter's next character will land, in the line's own size.
export function drawCursor(
  p: p5,
  lines: readonly PageLine[],
  typewriter: Typewriter,
): void {
  const { line, column } = typewriter.cursor;
  const { x, y, size, text } = lines[line];

  p.textSize(size);
  p.fill(PAPER);
  p.rect(
    Math.round(x + p.textWidth(text.slice(0, column))),
    Math.round(y - size * 0.8),
    Math.ceil(p.textWidth("M")),
    size,
  );
}

// A red line through `width` pixels of a line drawn at (x, y) in `size`.
export function drawStrike(
  p: p5,
  { x, y, size }: Omit<PageLine, "text">,
  width: number,
): void {
  p.fill(RED);
  p.rect(x, Math.round(y - size * STRIKE_RISE), width, STRIKE_WEIGHT);
}

// The regime's rubber stamp: the word in red, boxed and tilted, at `center`, in the current font.
export function drawStamp(
  p: p5,
  word: string,
  center: Vec,
  size: number,
): void {
  p.push();
  p.translate(center.x, center.y);
  p.rotate(STAMP_ANGLE);
  p.textSize(size);
  p.textAlign(p.CENTER, p.CENTER);

  p.noFill();
  p.stroke(RED);
  p.strokeWeight(STAMP_WEIGHT);
  p.rectMode(p.CENTER);
  p.rect(
    0,
    0,
    p.textWidth(word) + size * STAMP_PADDING * 2,
    size * STAMP_HEIGHT,
  );

  p.noStroke();
  p.fill(RED);
  p.text(word, 0, 0);
  p.pop();
}

export function drawScanlines(): void {}

export function drawGlitch(): void {}

// Clear in the middle, so it closes in from the edges without hiding the play.
const VIGNETTE_CLEAR = 0.5;
// Never fully gone mid-beat, so the pulse reads as a heartbeat and not a blink.
const VIGNETTE_PULSE_FLOOR = 0.6;

// The player feels watched without reading the meter.
export class Vignette {
  private readonly p: p5;
  private graphics: p5.Graphics | null = null;
  private glow = 0;
  private age = 0;

  constructor(p: p5) {
    this.p = p;
  }

  get strength(): number {
    const beat =
      (1 - Math.cos((2 * Math.PI * this.age) / VIGNETTE_PULSE_FRAMES)) / 2;
    return (
      this.glow * (VIGNETTE_PULSE_FLOOR + (1 - VIGNETTE_PULSE_FLOOR) * beat)
    );
  }

  update(seen: boolean): void {
    this.age++;
    const step = 1 / VIGNETTE_FADE_FRAMES;
    this.glow = seen
      ? Math.min(1, this.glow + step)
      : Math.max(0, this.glow - step);
  }

  draw(): void {
    if (this.glow === 0) return;

    const { p } = this;
    const context = p.drawingContext as CanvasRenderingContext2D;

    context.globalAlpha = VIGNETTE_ALPHA * this.strength;
    p.imageMode(p.CORNER);
    p.image(this.prerendered(), 0, 0);
    context.globalAlpha = 1;
  }

  // Built once: a gradient over the whole screen is too slow to redraw every frame.
  private prerendered(): p5.Graphics {
    if (this.graphics) return this.graphics;

    const graphics = this.p.createGraphics(CANVAS_WIDTH, CANVAS_HEIGHT);
    const context = graphics.drawingContext as CanvasRenderingContext2D;
    // Squeezed to a square, so the circular gradient becomes an ellipse that fits the screen.
    const squeeze = CANVAS_HEIGHT / CANVAS_WIDTH;
    const center = CANVAS_WIDTH / 2;
    const corner = Math.hypot(center, center);
    const gradient = context.createRadialGradient(
      center,
      center,
      corner * VIGNETTE_CLEAR,
      center,
      center,
      corner,
    );
    // Transparent red, not transparent black, so the fade never darkens on its way in.
    gradient.addColorStop(0, `${RED}00`);
    gradient.addColorStop(1, RED);

    context.scale(1, squeeze);
    context.fillStyle = gradient;
    context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_WIDTH);
    this.graphics = graphics;
    return graphics;
  }
}
