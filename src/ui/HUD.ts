import type p5 from "p5";
import { INK, PAPER } from "../config";
import { t } from "../i18n";
import type { Propaganda } from "../systems/Propaganda";

const MARGIN = 8;
const RIGHT_EDGE = 472;
const TOP_BASELINE = 20;
const SCORE_DIGITS = 6;

// Every value comes through Propaganda: the HUD shows what the Party allows, not what is real.
export class HUD {
  private readonly p: p5;
  private readonly font: p5.Font;
  private readonly propaganda: Propaganda;

  constructor(p: p5, font: p5.Font, propaganda: Propaganda) {
    this.p = p;
    this.font = font;
    this.propaganda = propaganda;
  }

  draw(): void {
    const { p, propaganda } = this;
    const score = String(propaganda.displayedScore()).padStart(
      SCORE_DIGITS,
      "0",
    );

    p.noStroke();
    p.textFont(this.font);
    p.textSize(20);

    p.textAlign(p.LEFT, p.BASELINE);
    this.text(`${t("hud.score")} ${score}`, MARGIN, TOP_BASELINE);

    p.textAlign(p.RIGHT, p.BASELINE);
    this.text(
      `${t("hud.lives")} ${propaganda.displayedLives()}`,
      RIGHT_EDGE,
      TOP_BASELINE,
    );
  }

  // The ink shadow lets the text read over plazas and sprites without a backing band.
  private text(text: string, x: number, y: number): void {
    const { p } = this;

    p.fill(INK);
    p.text(text, x + 1, y + 1);
    p.fill(PAPER);
    p.text(text, x, y);
  }
}
