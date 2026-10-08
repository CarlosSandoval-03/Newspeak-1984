import type p5 from "p5";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  GAME_OVER_TEXT_DELAY,
  INK,
  PAPER,
  PHOTO_FADE_FRAMES,
  RED,
  SIGNAL_OFF_FRAMES,
  STAMP_DELAY,
  STEEL,
} from "../config";
import type { Scene } from "../core/Scene";
import type { SceneManager } from "../core/SceneManager";
import { t } from "../i18n";
import { state } from "../state";
import { MenuScene } from "./MenuScene";

// The photo fills the top half at 2×; the stamp lands on the erased pilot's chest.
const PHOTO_HEIGHT = 320;
const STAMP_CENTER = { x: CANVAS_WIDTH / 2, y: 190 };
const STAMP_ANGLE = -0.14;
const STAMP_PADDING = 12;
const STAMP_HEIGHT = 56;
const LINE_Y = 400;
const PRESS_ENTER_Y = 460;
// Shares of the switch-off: the picture collapses, then the line shrinks, then the dot fades.
const COLLAPSE_END = 0.5;
const SHRINK_END = 0.8;
const DOT_SIZE = 4;

const STAMP_AT = SIGNAL_OFF_FRAMES + STAMP_DELAY;
const TEXT_AT = STAMP_AT + GAME_OVER_TEXT_DELAY;

// The run leaves no record here: a vaporized pilot never existed.
export class GameOverScene implements Scene {
  private readonly p: p5;
  private readonly manager: SceneManager;
  private readonly lastFrame: p5.Image;
  private age = 0;

  constructor(p: p5, manager: SceneManager, lastFrame: p5.Image) {
    this.p = p;
    this.manager = manager;
    this.lastFrame = lastFrame;
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

  draw(): void {
    const { p } = this;
    const { image, font } = this.manager.assets;
    const center = CANVAS_WIDTH / 2;

    p.background(INK);
    p.imageMode(p.CORNER);
    if (this.age < SIGNAL_OFF_FRAMES) {
      this.drawSignalOff();
      return;
    }

    const context = p.drawingContext as CanvasRenderingContext2D;
    context.globalAlpha = Math.min(
      1,
      (this.age - SIGNAL_OFF_FRAMES) / PHOTO_FADE_FRAMES,
    );
    p.image(image.vaporized, 0, 0, CANVAS_WIDTH, PHOTO_HEIGHT);
    context.globalAlpha = 1;

    p.textFont(font.machine);
    if (this.age >= STAMP_AT) this.drawStamp();
    if (!this.textShown) return;

    p.noStroke();
    p.textSize(20);
    p.textAlign(p.CENTER, p.BASELINE);

    p.fill(PAPER);
    p.text(t("gameOver.line", { id: state.pilotId }), center, LINE_Y);
    p.fill(STEEL);
    p.text(t("gameOver.pressEnter"), center, PRESS_ENTER_Y);
  }

  exit(): void {}

  // Like an old tube losing its sweep: the picture flattens into a burning line, then a dot.
  private drawSignalOff(): void {
    const { p } = this;
    const progress = this.age / SIGNAL_OFF_FRAMES;
    const middle = CANVAS_HEIGHT / 2;
    const context = p.drawingContext as CanvasRenderingContext2D;

    p.noStroke();
    p.fill(PAPER);

    if (progress < COLLAPSE_END) {
      const collapse = progress / COLLAPSE_END;
      const height = Math.max(2, CANVAS_HEIGHT * (1 - collapse) ** 2);
      const top = middle - height / 2;

      p.image(this.lastFrame, 0, top, CANVAS_WIDTH, height);
      context.globalAlpha = collapse;
      p.rect(0, top, CANVAS_WIDTH, height);
      context.globalAlpha = 1;
      return;
    }

    if (progress < SHRINK_END) {
      const shrink = (progress - COLLAPSE_END) / (SHRINK_END - COLLAPSE_END);
      const width = Math.max(DOT_SIZE, CANVAS_WIDTH * (1 - shrink) ** 2);
      p.rect(CANVAS_WIDTH / 2 - width / 2, middle - 1, width, 2);
      return;
    }

    // The dot lingers and fades, the last trace of the broadcast.
    context.globalAlpha = 1 - (progress - SHRINK_END) / (1 - SHRINK_END);
    p.rect(
      CANVAS_WIDTH / 2 - DOT_SIZE / 2,
      middle - DOT_SIZE / 2,
      DOT_SIZE,
      DOT_SIZE,
    );
    context.globalAlpha = 1;
  }

  private drawStamp(): void {
    const { p } = this;
    const word = t("gameOver.stamp");

    p.push();
    p.translate(STAMP_CENTER.x, STAMP_CENTER.y);
    p.rotate(STAMP_ANGLE);
    p.textSize(40);
    p.textAlign(p.CENTER, p.CENTER);

    p.noFill();
    p.stroke(RED);
    p.strokeWeight(3);
    p.rectMode(p.CENTER);
    p.rect(0, 0, p.textWidth(word) + STAMP_PADDING * 2, STAMP_HEIGHT);

    p.noStroke();
    p.fill(RED);
    p.text(word, 0, 0);
    p.pop();
  }
}
