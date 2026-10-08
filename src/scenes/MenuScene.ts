import type p5 from "p5";
import { CANVAS_WIDTH, INK, PAPER, RED, STEEL } from "../config";
import type { Scene } from "../core/Scene";
import type { SceneManager } from "../core/SceneManager";
import { currentLanguage, LANGUAGES, setLanguage, t } from "../i18n";
import { resetGame } from "../state";
import { GameScene } from "./GameScene";

const OPTIONS = ["start", "language"] as const;

// The illustration fills the top half at 2×; the title sits on its dark lower third.
const ILLUSTRATION_HEIGHT = 320;
const TITLE_Y = 312;
const OPTIONS_Y = 400;
const OPTION_GAP = 30;
const CONTROLS_Y = 620;

export class MenuScene implements Scene {
  private readonly p: p5;
  private readonly manager: SceneManager;
  private selected = 0;

  constructor(p: p5, manager: SceneManager) {
    this.p = p;
    this.manager = manager;
  }

  enter(): void {
    this.selected = 0;
  }

  update(): void {
    const { input } = this.manager;

    if (input.wasPressed("up")) this.selected = Math.max(0, this.selected - 1);
    if (input.wasPressed("down"))
      this.selected = Math.min(OPTIONS.length - 1, this.selected + 1);

    // Shoot confirms only here; anywhere else a held fire button would skip text.
    const activate = input.wasPressed("confirm") || input.wasPressed("shoot");

    switch (OPTIONS[this.selected]) {
      case "start":
        if (activate) {
          resetGame();
          this.manager.change(new GameScene(this.p, this.manager));
        }
        break;
      case "language":
        if (activate || input.wasPressed("right")) this.cycleLanguage(1);
        if (input.wasPressed("left")) this.cycleLanguage(-1);
        break;
    }
  }

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
    p.textSize(60);
    p.text(t("menu.title"), center, TITLE_Y);

    // Drawn every frame, so a language switch shows at once.
    const labels = {
      start: t("menu.start"),
      language: t("menu.language", { language: t("meta.languageName") }),
    };
    p.textSize(20);
    OPTIONS.forEach((option, i) => {
      p.fill(i === this.selected ? RED : PAPER);
      p.text(labels[option], center, OPTIONS_Y + i * OPTION_GAP);
    });

    p.fill(STEEL);
    p.text(t("menu.controls"), center, CONTROLS_Y);
  }

  exit(): void {}

  private cycleLanguage(step: number): void {
    const index = LANGUAGES.indexOf(currentLanguage());
    const next = (index + step + LANGUAGES.length) % LANGUAGES.length;

    setLanguage(LANGUAGES[next]);
  }
}
