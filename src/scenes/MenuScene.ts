import type p5 from "p5";
import { CANVAS_WIDTH, INK, PAPER, RED, STEEL } from "../config";
import type { Scene } from "../core/Scene";
import type { SceneManager } from "../core/SceneManager";
import { currentLanguage, LANGUAGES, setLanguage, t } from "../i18n";
import { resetGame } from "../state";
import { type HonorRollEntry, readHonorRoll } from "../systems/HonorRoll";
import { drawHonorRoll } from "../ui/honorRollTable";
import { EnlistmentScene } from "./EnlistmentScene";

const OPTIONS = ["start", "honorRoll", "language"] as const;

// The illustration fills the top half at 2×; the title sits on its dark lower third.
const ILLUSTRATION_HEIGHT = 320;
const TITLE_Y = 312;
const OPTIONS_Y = 400;
const OPTION_GAP = 30;
const CONTROLS_Y = 620;
const HONOR_ROLL_Y = 344;
const TITLE_SIZE = 60;
const TEXT_SIZE = 20;

export class MenuScene implements Scene {
  private readonly p: p5;
  private readonly manager: SceneManager;
  private selected = 0;
  // Read once when opened, so the archive isn't parsed every frame.
  private honorRoll: HonorRollEntry[] | null = null;

  constructor(p: p5, manager: SceneManager) {
    this.p = p;
    this.manager = manager;
  }

  enter(): void {
    this.selected = 0;
  }

  update(): void {
    const { input } = this.manager;
    // Shoot confirms only here; anywhere else a held fire button would skip text.
    const activate = input.wasPressed("confirm") || input.wasPressed("shoot");

    if (this.honorRoll) {
      if (activate || input.wasPressed("pause")) this.honorRoll = null;
      return;
    }

    if (input.wasPressed("up")) this.selected = Math.max(0, this.selected - 1);
    if (input.wasPressed("down"))
      this.selected = Math.min(OPTIONS.length - 1, this.selected + 1);

    switch (OPTIONS[this.selected]) {
      case "start":
        if (activate) {
          resetGame();
          this.manager.change(new EnlistmentScene(this.p, this.manager));
        }
        break;
      case "honorRoll":
        if (activate) this.honorRoll = readHonorRoll();
        break;
      case "language":
        if (activate || input.wasPressed("right")) this.cycleLanguage(1);
        if (input.wasPressed("left")) this.cycleLanguage(-1);
        break;
    }
  }

  // The city at the top, the title on its dark lower third, then the options and the controls, or
  // the honor roll and how to close it.
  draw(): void {
    const { p } = this;
    const { image, font } = this.manager.assets;
    const center = CANVAS_WIDTH / 2;

    p.background(INK);
    p.imageMode(p.CORNER);
    p.image(image["menu-city"], 0, 0, CANVAS_WIDTH, ILLUSTRATION_HEIGHT);

    p.noStroke();
    p.textFont(font.machine);
    p.textAlign(p.CENTER, p.BASELINE);
    p.fill(PAPER);
    p.textSize(TITLE_SIZE);
    p.text(t("menu.title"), center, TITLE_Y);

    p.textSize(TEXT_SIZE);
    if (this.honorRoll) {
      drawHonorRoll(p, this.honorRoll, center, HONOR_ROLL_Y);
      p.fill(STEEL);
      p.text(t("menu.pressEnter"), center, CONTROLS_Y);
      return;
    }

    this.drawOptions(center);
    p.fill(STEEL);
    p.text(t("menu.controls"), center, CONTROLS_Y);
  }

  exit(): void {}

  // Labels are read every frame, so a language switch shows at once.
  private drawOptions(center: number): void {
    const { p } = this;
    const labels = {
      start: t("menu.start"),
      honorRoll: t("menu.honorRoll"),
      language: t("menu.language", { language: t("meta.languageName") }),
    };

    OPTIONS.forEach((option, i) => {
      p.fill(i === this.selected ? RED : PAPER);
      p.text(labels[option], center, OPTIONS_Y + i * OPTION_GAP);
    });
  }

  private cycleLanguage(step: number): void {
    const index = LANGUAGES.indexOf(currentLanguage());
    const next = (index + step + LANGUAGES.length) % LANGUAGES.length;

    setLanguage(LANGUAGES[next]);
  }
}
