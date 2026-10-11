import type p5 from "p5";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  CURSOR_BLINK_FRAMES,
  RED,
  TYPEWRITER_CPF,
  VIGNETTE_ALPHA,
  VIGNETTE_FADE_FRAMES,
  VIGNETTE_PULSE_FRAMES,
} from "../config";

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
