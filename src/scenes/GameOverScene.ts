import type p5 from "p5";
import {
  CANVAS_WIDTH,
  GAME_OVER_TEXT_DELAY,
  INK,
  PAPER,
  RED,
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

// The run leaves no record here: a vaporized pilot never existed.
export class GameOverScene implements Scene {
  private readonly p: p5;
  private readonly manager: SceneManager;
  private age = 0;

  constructor(p: p5, manager: SceneManager) {
    this.p = p;
    this.manager = manager;
  }

  private get textShown(): boolean {
    return this.age >= STAMP_DELAY + GAME_OVER_TEXT_DELAY;
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
    p.image(image.vaporized, 0, 0, CANVAS_WIDTH, PHOTO_HEIGHT);

    p.textFont(font.machine);
    if (this.age >= STAMP_DELAY) this.drawStamp();
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
