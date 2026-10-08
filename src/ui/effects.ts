import type p5 from "p5";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  RED,
  VIGNETTE_ALPHA,
  VIGNETTE_FADE_FRAMES,
  VIGNETTE_PULSE_FRAMES,
} from "../config";

export class Typewriter {}

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
