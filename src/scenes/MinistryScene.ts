import type p5 from "p5";
import {
  CANVAS_WIDTH,
  INK,
  PAPER,
  SLIDE_FRAMES,
  STAMP_DELAY,
  STRIKE_FRAMES,
  TICK_MS,
} from "../config";
import { smoothstep } from "../core/math";
import type { Scene } from "../core/Scene";
import type { SceneManager } from "../core/SceneManager";
import { currentStrings, format, t } from "../i18n";
import { LEVELS } from "../levels/levels";
import { state } from "../state";
import type { Report } from "../systems/Ministry";
import { VERDICT } from "../types";
import {
  drawCursor,
  drawStamp,
  drawStrike,
  type PageLine,
  scoreDigits,
  stack,
  Typewriter,
  wrap,
} from "../ui/effects";
import { DictionaryScene } from "./DictionaryScene";
import { MenuScene } from "./MenuScene";

// The clerk's room at 2×, cut above the floor; the slot is the burning window behind him.
const ILLUSTRATION = { y: 68, rows: 120 };
const SLOT = { x: 140, y: 68 + 2 * 56 };
const MARGIN = 24;
const HEADER_Y = 32;
const NUMBER_X = 312;
const REPORTED_Y = 340;
const OFFICIAL_Y = 368;
const CORRECTIONS_Y = 404;
const CORRECTION_LINES_Y = 428;
const CORRECTION_COLUMNS = 45;
const HEADING_SIZE = 20;
const PROSE_SIZE = 16;
const STAMP_CENTER = { x: 360, y: 404 };
const STAMP_SIZE = 32;
const PROMPT_Y = 632;
const PROMPT_SIZE = 20;

// The Records Department closes the level's file in front of the pilot: the real score is struck
// out, the official one is typed in with the corrections that justify it, and only then does the
// real one go down the memory hole, before the verdict's stamp lands.
export class MinistryScene implements Scene {
  private readonly p: p5;
  private readonly manager: SceneManager;
  private readonly report: Report;
  // The header and the real score, whose number is the last line.
  private readonly record: PageLine[];
  // The official score and the corrections.
  private readonly correction: PageLine[];
  private readonly recordTyping: Typewriter;
  private readonly correctionTyping: Typewriter;
  private strikeAge = 0;
  private slideAge = 0;
  private stampAge = 0;

  constructor(p: p5, manager: SceneManager, report: Report) {
    this.p = p;
    this.manager = manager;
    this.report = report;
    this.record = recordLines(report);
    this.correction = correctionLines(report);
    this.recordTyping = new Typewriter(this.record.map(({ text }) => text));
    this.correctionTyping = new Typewriter(
      this.correction.map(({ text }) => text),
    );
  }

  private get settled(): boolean {
    return this.stampAge >= STAMP_DELAY;
  }

  enter(): void {}

  // Enter first settles the page, then leaves, so a press never skips what wasn't seen. Otherwise
  // one thing happens at a time: the record is typed and its score struck, the correction is typed,
  // then the struck score is sent down the hole and the file stamped.
  update(): void {
    if (this.manager.input.wasPressed("confirm")) {
      if (this.settled) {
        this.leave();
        return;
      }
      this.settle();
    }

    if (!this.recordTyping.done) this.recordTyping.update();
    else if (this.strikeAge < STRIKE_FRAMES) this.strikeAge++;
    else if (!this.correctionTyping.done) this.correctionTyping.update();
    else if (this.slideAge < SLIDE_FRAMES) this.slideAge++;
    else if (this.stampAge < STAMP_DELAY) this.stampAge++;
  }

  // The clerk's room, the record with its score on the way down the hole, the correction under it
  // with the typewriter's cursor, and once settled the stamp and the prompt.
  draw(): void {
    const { p } = this;
    const { font } = this.manager.assets;

    p.background(INK);
    this.drawIllustration();

    // The pages, in the paperwork's typewriter face.
    p.noStroke();
    p.textFont(font.paperwork);
    p.textAlign(p.LEFT, p.BASELINE);
    this.record.slice(0, -1).forEach((line, i) => {
      this.drawLine(line, this.recordTyping.shown(i));
    });
    this.drawReportedScore();
    this.correction.forEach((line, i) => {
      this.drawLine(line, this.correctionTyping.shown(i));
    });
    this.drawTypingCursor();

    if (!this.settled) return;
    p.textFont(font.machine);
    drawStamp(p, t(this.stampKey), STAMP_CENTER, STAMP_SIZE);
    this.drawPrompt();
  }

  exit(): void {}

  private get stampKey() {
    return this.report.verdict === VERDICT.hero
      ? ("ministry.stamps.approved" as const)
      : ("ministry.stamps.corrected" as const);
  }

  private settle(): void {
    this.recordTyping.finish();
    this.correctionTyping.finish();
    this.strikeAge = STRIKE_FRAMES;
    this.slideAge = SLIDE_FRAMES;
    this.stampAge = STAMP_DELAY;
  }

  // The next level's Dictionary, or the Menu after the last level, until the endings exist.
  private leave(): void {
    if (state.level < LEVELS.length) {
      state.level++;
      this.manager.change(new DictionaryScene(this.p, this.manager));
    } else this.manager.change(new MenuScene(this.p, this.manager));
  }

  private drawIllustration(): void {
    const { p } = this;
    const image = this.manager.assets.image["memory-hole"];

    p.imageMode(p.CORNER);
    p.image(
      image,
      0,
      ILLUSTRATION.y,
      CANVAS_WIDTH,
      ILLUSTRATION.rows * 2,
      0,
      0,
      image.width,
      ILLUSTRATION.rows,
    );
  }

  private drawLine({ x, y, size }: PageLine, shown: string): void {
    const { p } = this;

    p.textSize(size);
    p.fill(PAPER);
    p.text(shown, x, y);
  }

  // Struck out once typed, and once the correction is in, slid into the slot, fading as it falls in.
  private drawReportedScore(): void {
    const { p } = this;
    const line = this.record[this.record.length - 1];
    const shown = this.recordTyping.shown(this.record.length - 1);
    const slide = smoothstep(this.slideAge / SLIDE_FRAMES);
    if (slide === 1) return;

    p.textSize(line.size);
    const width = p.textWidth(shown);
    const at = {
      ...line,
      x: Math.round(line.x + (SLOT.x - width / 2 - line.x) * slide),
      y: Math.round(line.y + (SLOT.y - line.y) * slide),
    };
    const context = p.drawingContext as CanvasRenderingContext2D;

    context.globalAlpha = 1 - slide;
    this.drawLine(at, shown);
    drawStrike(p, at, Math.round((width * this.strikeAge) / STRIKE_FRAMES));
    context.globalAlpha = 1;
  }

  // On whichever page is being typed; none while the score is struck.
  private drawTypingCursor(): void {
    const { p } = this;

    if (!this.recordTyping.done) {
      if (this.recordTyping.cursorVisible)
        drawCursor(p, this.record, this.recordTyping);
      return;
    }
    if (this.strikeAge < STRIKE_FRAMES || this.correctionTyping.done) return;
    if (this.correctionTyping.cursorVisible)
      drawCursor(p, this.correction, this.correctionTyping);
  }

  private drawPrompt(): void {
    const { p } = this;

    p.textSize(PROMPT_SIZE);
    p.textAlign(p.CENTER, p.BASELINE);
    p.fill(PAPER);
    p.text(t("ministry.pressEnter"), CANVAS_WIDTH / 2, PROMPT_Y);
  }
}

// The department's header, then the real score: its label, and its number last, alone, so it can
// be struck out and sent down the hole.
function recordLines({ realScore }: Report): PageLine[] {
  const { ministry } = currentStrings();
  const heading = { x: MARGIN, size: HEADING_SIZE };

  return [
    ...stack([ministry.header, ministry.department], {
      ...heading,
      y: HEADER_Y,
    }),
    ...stack([ministry.reportedScore], { ...heading, y: REPORTED_Y }),
    ...stack([scoreDigits(realScore)], {
      x: NUMBER_X,
      y: REPORTED_Y,
      size: HEADING_SIZE,
    }),
  ];
}

// The official score, then one correction per stat that isn't zero, each wrapped to the page.
function correctionLines(report: Report): PageLine[] {
  const { ministry } = currentStrings();

  return [
    ...stack([ministry.officialScore], {
      x: MARGIN,
      y: OFFICIAL_Y,
      size: HEADING_SIZE,
    }),
    ...stack([scoreDigits(report.officialScore)], {
      x: NUMBER_X,
      y: OFFICIAL_Y,
      size: HEADING_SIZE,
    }),
    ...stack([ministry.correctionsTitle], {
      x: MARGIN,
      y: CORRECTIONS_Y,
      size: PROSE_SIZE,
    }),
    ...stack(
      corrections(report).flatMap((text) => wrap(text, CORRECTION_COLUMNS)),
      { x: MARGIN, y: CORRECTION_LINES_Y, size: PROSE_SIZE },
    ),
  ];
}

// Every stat but kills is corrected to 0; the kills line follows the verdict.
function corrections({ stats, officialKills, verdict }: Report): string[] {
  const { corrections } = currentStrings().ministry;
  const seconds = Math.round((stats.framesSeen * TICK_MS) / 1000);
  const lines: string[] = [];

  if (stats.kills)
    lines.push(
      format(corrections.kills[verdict], {
        from: stats.kills,
        to: officialKills,
      }),
    );
  if (stats.eyesDestroyed)
    lines.push(
      format(corrections.eyesDestroyed, { from: stats.eyesDestroyed }),
    );
  if (seconds) lines.push(format(corrections.secondsSeen, { from: seconds }));
  if (stats.diaries)
    lines.push(format(corrections.diaries, { from: stats.diaries }));
  return lines;
}
