import type p5 from "p5";
import {
  ALERT_THRESHOLDS,
  CONCRETE,
  INK,
  LEATHER,
  PAPER,
  RED,
  STEEL,
  SUSPICION_MAX,
} from "../config";
import { t } from "../i18n";
import type { Propaganda, WordView } from "../systems/Propaganda";

const MARGIN = 8;
const RIGHT_EDGE = 472;
const TOP_BASELINE = 20;
const SCORE_DIGITS = 6;
const SECOND_BASELINE = 42;
const METER = { x: 88, y: 32, w: 120, h: 8 };
const STATE_X = 216;
const BOSS_BAR = { x: 8, y: 50, w: 464, h: 4 };
const WORDS_BASELINE = 604;
const PIP_Y = 608;
const PIP_SIZE = 3;
const PIP_STEP = 5;
// Through the middle of the capitals, like a pen through a dictionary entry.
const STRIKE_RISE = 7;
const STRIKE_WEIGHT = 2;
// TRUTH's inverted box, from above the capitals to just under the baseline.
const BOX_RISE = 15;
const BOX_HEIGHT = 18;
// Indexed by alert level.
const STATES = ["normal", "alert", "pursuit", "thoughtPolice"] as const;

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

  // `bossHealth` is the boss's share of hp left, or null while no boss is on screen.
  draw(bossHealth: number | null = null): void {
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

    p.textAlign(p.LEFT, p.BASELINE);
    this.text(t("hud.suspicion"), MARGIN, SECOND_BASELINE);
    this.meter(propaganda.displayedSuspicion());
    this.text(
      t(`hud.states.${STATES[propaganda.displayedAlert()]}`),
      STATE_X,
      SECOND_BASELINE,
    );

    // Red, because so far the only boss is the regime's own.
    if (bossHealth !== null) {
      const { x, y, w, h } = BOSS_BAR;
      p.fill(INK);
      p.rect(x, y, w, h);
      p.fill(RED);
      p.rect(x, y, Math.round(w * bossHealth), h);
    }

    this.words(propaganda.displayedWords());
  }

  // The arsenal written as a dictionary entry: everything about a word shows on the word itself,
  // so losing one is seen where the power was.
  private words(words: WordView[]): void {
    const { p } = this;
    // Two spaces: p5 measures a run of spaces as nothing, but VT323 is monospaced, so any two
    // characters are as wide.
    const gap = p.textWidth("MM");
    let x = MARGIN;

    p.textAlign(p.LEFT, p.BASELINE);
    for (const view of words) {
      const text = t(`words.${view.word}`);
      const w = Math.ceil(p.textWidth(text));
      this.word(view, text, x, w);
      x += w + gap;
    }
  }

  private word(view: WordView, text: string, x: number, w: number): void {
    const { p } = this;
    const y = WORDS_BASELINE;

    // Inverted while TRUTH shows the truth, with a bar under it that drains with the time left.
    if (view.status === "active") {
      p.fill(PAPER);
      p.rect(x - 2, y - BOX_RISE, w + 4, BOX_HEIGHT);
      p.fill(INK);
      p.text(text, x, y);
      this.pip(x - 2, Math.round((w + 4) * view.timeLeft), PAPER);
      return;
    }

    this.text(text, x, y, view.status === "ready" ? PAPER : STEEL);
    if (view.status === "removed") {
      p.fill(RED);
      p.rect(x, y - STRIKE_RISE, w, STRIKE_WEIGHT);
      return;
    }

    // A diary's leather marks a word given back; REMEMBER's spent bombs stay as concrete pips.
    const filled =
      view.status === "recharging" ? STEEL : view.restored ? LEATHER : PAPER;
    for (let i = 0; i < view.pips + view.spent; i++)
      this.pip(x + i * PIP_STEP, PIP_SIZE, i < view.pips ? filled : CONCRETE);
  }

  // With the text's ink shadow, so a pip reads over any ground.
  private pip(x: number, w: number, color: string): void {
    const { p } = this;

    p.fill(INK);
    p.rect(x + 1, PIP_Y + 1, w, PIP_SIZE);
    p.fill(color);
    p.rect(x, PIP_Y, w, PIP_SIZE);
  }

  // A steel frame around an ink well that fills in red, with ink ticks where the alert levels begin.
  private meter(suspicion: number): void {
    const { p } = this;
    const x = METER.x + 1;
    const y = METER.y + 1;
    const w = METER.w - 2;
    const h = METER.h - 2;
    const at = (value: number) => Math.round((w * value) / SUSPICION_MAX);

    p.fill(STEEL);
    p.rect(METER.x, METER.y, METER.w, METER.h);
    p.fill(INK);
    p.rect(x, y, w, h);
    p.fill(RED);
    p.rect(x, y, at(suspicion), h);

    p.fill(INK);
    for (const threshold of [ALERT_THRESHOLDS.alert, ALERT_THRESHOLDS.pursuit])
      p.rect(x + at(threshold), y, 1, h);
  }

  // The ink shadow lets the text read over plazas and sprites without a backing band.
  private text(text: string, x: number, y: number, color = PAPER): void {
    const { p } = this;

    p.fill(INK);
    p.text(text, x + 1, y + 1);
    p.fill(color);
    p.text(text, x, y);
  }
}
