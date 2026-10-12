import type p5 from "p5";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  GAME_OVER_TEXT_DELAY,
  INK,
  PAPER,
  PHOTO_FADE_FRAMES,
  SIGNAL_OFF_FRAMES,
  STAMP_DELAY,
  STEEL,
} from "../config";
import type { Scene } from "../core/Scene";
import type { SceneManager } from "../core/SceneManager";
import { t } from "../i18n";
import { state } from "../state";
import { enterHonorRoll } from "../systems/HonorRoll";
import { standingScore } from "../systems/Ministry";
import { drawStamp } from "../ui/effects";
import { MenuScene } from "./MenuScene";

// The photo fills the top half at 2×; the stamp lands on the erased pilot's chest.
const PHOTO_HEIGHT = 320;
const STAMP_CENTER = { x: CANVAS_WIDTH / 2, y: 190 };
const STAMP_SIZE = 40;
const TEXT_SIZE = 20;
const LINE_Y = 400;
const PRESS_ENTER_Y = 460;
// Shares of the switch-off: the picture collapses, then the line shrinks, then the dot fades.
const COLLAPSE_END = 0.5;
const SHRINK_END = 0.8;
const DOT_SIZE = 4;

const STAMP_AT = SIGNAL_OFF_FRAMES + STAMP_DELAY;
const TEXT_AT = STAMP_AT + GAME_OVER_TEXT_DELAY;

// A vaporized pilot never existed: the run goes on the honor roll as an unperson, the Party keeping
// the number and erasing the name.
export class GameOverScene implements Scene {
  private readonly p: p5;
  private readonly manager: SceneManager;
  private readonly lastFrame: p5.Image;
  private age = 0;

  constructor(p: p5, manager: SceneManager, lastFrame: p5.Image) {
    this.p = p;
    this.manager = manager;
    this.lastFrame = lastFrame;
    enterHonorRoll({
      pilotId: state.pilotId,
      score: standingScore(),
      unperson: true,
    });
  }

  private get textShown(): boolean {
    return this.age >= TEXT_AT;
  }

  enter(): void {
    this.age = 0;
  }

  update(): void {
    // Checked before the clock moves, so Enter only counts once PRESS ENTER has been drawn.
    if (this.textShown && this.manager.input.wasPressed("confirm")) {
      this.manager.change(new MenuScene(this.p, this.manager));
      return;
    }

    this.age++;
  }

  // The telescreen switches off; then the squadron photo fades in, the stamp lands on it, and the
  // pilot's erasure is typed out under it.
  draw(): void {
    const { p } = this;

    p.background(INK);
    p.imageMode(p.CORNER);
    if (this.age < SIGNAL_OFF_FRAMES) {
      this.drawSignalOff(this.age / SIGNAL_OFF_FRAMES);
      return;
    }

    this.drawPhoto();
    p.textFont(this.manager.assets.font.machine);
    if (this.age >= STAMP_AT)
      drawStamp(p, t("gameOver.stamp"), STAMP_CENTER, STAMP_SIZE);
    if (this.textShown) this.drawText();
  }

  exit(): void {}

  // Like an old tube losing its sweep: the picture flattens into a burning line, then a dot that
  // lingers and fades, the last trace of the broadcast.
  private drawSignalOff(progress: number): void {
    const { p } = this;

    p.noStroke();
    p.fill(PAPER);
    if (progress < COLLAPSE_END) this.drawCollapse(progress / COLLAPSE_END);
    else if (progress < SHRINK_END)
      this.drawLine((progress - COLLAPSE_END) / (SHRINK_END - COLLAPSE_END));
    else this.drawDot((progress - SHRINK_END) / (1 - SHRINK_END));
  }

  // The last frame squeezed toward the middle line, burning white as it goes.
  private drawCollapse(collapse: number): void {
    const { p } = this;
    const context = p.drawingContext as CanvasRenderingContext2D;
    const height = Math.max(2, CANVAS_HEIGHT * (1 - collapse) ** 2);
    const top = CANVAS_HEIGHT / 2 - height / 2;

    p.image(this.lastFrame, 0, top, CANVAS_WIDTH, height);
    context.globalAlpha = collapse;
    p.rect(0, top, CANVAS_WIDTH, height);
    context.globalAlpha = 1;
  }

  private drawLine(shrink: number): void {
    const width = Math.max(DOT_SIZE, CANVAS_WIDTH * (1 - shrink) ** 2);
    this.p.rect(CANVAS_WIDTH / 2 - width / 2, CANVAS_HEIGHT / 2 - 1, width, 2);
  }

  private drawDot(fade: number): void {
    const { p } = this;
    const context = p.drawingContext as CanvasRenderingContext2D;

    context.globalAlpha = 1 - fade;
    p.rect(
      CANVAS_WIDTH / 2 - DOT_SIZE / 2,
      CANVAS_HEIGHT / 2 - DOT_SIZE / 2,
      DOT_SIZE,
      DOT_SIZE,
    );
    context.globalAlpha = 1;
  }

  private drawPhoto(): void {
    const { p } = this;
    const context = p.drawingContext as CanvasRenderingContext2D;

    context.globalAlpha = Math.min(
      1,
      (this.age - SIGNAL_OFF_FRAMES) / PHOTO_FADE_FRAMES,
    );
    p.image(
      this.manager.assets.image.vaporized,
      0,
      0,
      CANVAS_WIDTH,
      PHOTO_HEIGHT,
    );
    context.globalAlpha = 1;
  }

  private drawText(): void {
    const { p } = this;
    const center = CANVAS_WIDTH / 2;

    p.noStroke();
    p.textSize(TEXT_SIZE);
    p.textAlign(p.CENTER, p.BASELINE);
    p.fill(PAPER);
    p.text(t("gameOver.line", { id: state.pilotId }), center, LINE_Y);
    p.fill(STEEL);
    p.text(t("gameOver.pressEnter"), center, PRESS_ENTER_Y);
  }
}
