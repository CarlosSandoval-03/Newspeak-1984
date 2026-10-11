import type p5 from "p5";
import {
  CANVAS_WIDTH,
  INK,
  PAPER,
  RED,
  STEEL,
  STRIKE_FRAMES,
  WORD_REMOVAL_ORDER,
} from "../config";
import type { Scene } from "../core/Scene";
import type { SceneManager } from "../core/SceneManager";
import { currentStrings, format, t } from "../i18n";
import { state } from "../state";
import { removedAt } from "../systems/Newspeak";
import type { Word } from "../types";
import { Typewriter, wrap } from "../ui/effects";
import { GameScene } from "./GameScene";

// Illustrations at 2×; the heading and the words stand in a column right of the cover.
const COVER = { x: 24, y: 40 };
const COLUMN_X = 240;
const HEADING_COLUMNS = 17;
const HEADING_Y = 64;
const EDITION_Y = 120;
const WORDS_Y = 184;
const WORDS_STEP = 28;
const NOTICE = { x: 24, y: 336 };
const PORTRAIT = { x: 24, y: 368 };
const BRIEFING = { x: 168, y: 384, columns: 29 };
const PROMPT_Y = 600;
const PROMPT_SIZE = 20;
const HEADING_SIZE = 20;
const PROSE_SIZE = 16;
const LINE_HEIGHT = 1.2;
// Through the middle of the capitals.
const STRIKE_RISE = 0.3;
const STRIKE_WEIGHT = 2;

// "earlier" words were struck in past editions; "now" is struck while the player watches.
type Line = {
  text: string;
  x: number;
  y: number;
  size: number;
  strike: "earlier" | "now" | null;
};

// The official dictionary before each level: the edition, the words, and this level's word struck
// out, announced in advance by the Officer. Censorship as a ritual.
export class DictionaryScene implements Scene {
  private readonly p: p5;
  private readonly manager: SceneManager;
  private readonly lines: Line[];
  private readonly typewriter: Typewriter;
  private readonly now: number;
  private strikeAge = 0;

  constructor(p: p5, manager: SceneManager) {
    this.p = p;
    this.manager = manager;
    this.lines = page();
    this.typewriter = new Typewriter(this.lines.map(({ text }) => text));
    // Level 1 strikes nothing, so its page is settled once typed.
    this.now = this.lines.findIndex(({ strike }) => strike === "now");
    if (this.now === -1) this.strikeAge = STRIKE_FRAMES;
  }

  private get struck(): boolean {
    return this.strikeAge >= STRIKE_FRAMES;
  }

  // Ready for the pilot to take off: every line typed and the word fully struck.
  private get settled(): boolean {
    return this.typewriter.done && this.struck;
  }

  enter(): void {}

  // Enter first finishes the page, then takes off, so a press never skips what wasn't seen.
  update(): void {
    if (this.manager.input.wasPressed("confirm")) {
      if (this.settled) {
        this.manager.change(new GameScene(this.p, this.manager));
        return;
      }
      this.typewriter.finish();
      this.strikeAge = STRIKE_FRAMES;
    }

    this.typewriter.update();
    if (this.now !== -1 && this.typewriter.typedLine(this.now))
      this.strikeAge = Math.min(STRIKE_FRAMES, this.strikeAge + 1);
  }

  // The cover and the Officer, the page typed so far with its cursor, and the prompt once settled.
  draw(): void {
    const { p } = this;
    const { font } = this.manager.assets;

    p.background(INK);
    this.illustrations();

    p.noStroke();
    p.textFont(font.paperwork);
    p.textAlign(p.LEFT, p.BASELINE);
    this.lines.forEach((line, i) => this.line(line, this.typewriter.shown(i)));
    if (!this.typewriter.done && this.typewriter.cursorVisible) this.cursor();

    if (this.settled) this.prompt();
  }

  exit(): void {}

  // At 2×, the cover beside the heading and the Officer beside his briefing.
  private illustrations(): void {
    const { p } = this;
    const { image } = this.manager.assets;
    const cover = image["dictionary-cover"];
    const portrait = image["officer-portrait"];

    p.imageMode(p.CORNER);
    p.image(cover, COVER.x, COVER.y, cover.width * 2, cover.height * 2);
    p.image(
      portrait,
      PORTRAIT.x,
      PORTRAIT.y,
      portrait.width * 2,
      portrait.height * 2,
    );
  }

  private prompt(): void {
    const { p } = this;

    p.textFont(this.manager.assets.font.machine);
    p.textSize(PROMPT_SIZE);
    p.textAlign(p.CENTER, p.BASELINE);
    p.fill(PAPER);
    p.text(t("dictionary.takeOff"), CANVAS_WIDTH / 2, PROMPT_Y);
  }

  private line(line: Line, shown: string): void {
    const { p } = this;

    p.textSize(line.size);
    p.fill(line.strike === "earlier" ? STEEL : PAPER);
    p.text(shown, line.x, line.y);
    if (!line.strike) return;

    // An earlier word is struck as it is typed; this level's after it, while the player watches.
    const share =
      line.strike === "earlier" ? 1 : this.strikeAge / STRIKE_FRAMES;
    const w = Math.round(p.textWidth(shown) * share);
    p.fill(RED);
    p.rect(
      line.x,
      Math.round(line.y - line.size * STRIKE_RISE),
      w,
      STRIKE_WEIGHT,
    );
  }

  // A one-character block where the next character will land, in the line's own size.
  private cursor(): void {
    const { p } = this;
    const { line, column } = this.typewriter.cursor;
    const { x, y, size, text } = this.lines[line];

    p.textSize(size);
    p.fill(PAPER);
    p.rect(
      Math.round(x + p.textWidth(text.slice(0, column))),
      Math.round(y - size * 0.8),
      Math.ceil(p.textWidth("M")),
      size,
    );
  }
}

// The page for the level about to start, top to bottom, in the order it is typed: the heading and
// the edition beside the cover, the four words with this level's struck, the notice, and the briefing.
function page(): Line[] {
  const { dictionary, briefings } = currentStrings();
  const { level, pilotId, verdict } = state;
  const removed = removedAt(level);
  const name = (word: Word) => t(`words.${word}`);

  return [
    ...block(wrap(dictionary.heading, HEADING_COLUMNS), {
      x: COLUMN_X,
      y: HEADING_Y,
      size: HEADING_SIZE,
    }),
    ...block(
      wrap(
        format(dictionary.edition, { ordinal: dictionary.ordinals[level - 1] }),
        HEADING_COLUMNS,
      ),
      { x: COLUMN_X, y: EDITION_Y, size: HEADING_SIZE },
    ),
    // Struck "now" as the page is typed, "earlier" if a past edition took it.
    ...WORD_REMOVAL_ORDER.flatMap((word, i) =>
      block([name(word)], {
        x: COLUMN_X,
        y: WORDS_Y + i * WORDS_STEP,
        size: HEADING_SIZE,
        strike: word === removed ? "now" : i < level - 2 ? "earlier" : null,
      }),
    ),
    ...block(
      [
        removed
          ? format(dictionary.removed, { word: name(removed) })
          : dictionary.noneRemoved,
      ],
      { ...NOTICE, size: PROSE_SIZE },
    ),
    // The tone follows the Ministry's verdict on the last level.
    ...block(
      wrap(
        format(briefings[level - 1][verdict], {
          id: pilotId,
          word: removed ? name(removed) : "",
        }),
        BRIEFING.columns,
      ),
      { x: BRIEFING.x, y: BRIEFING.y, size: PROSE_SIZE },
    ),
  ];
}

// Lines stacked down from (x, y), each as tall as its size and the line height.
function block(
  texts: string[],
  { x, y, size, strike = null }: Omit<Line, "text" | "strike"> & {
    strike?: Line["strike"];
  },
): Line[] {
  return texts.map((text, i) => ({
    text,
    x,
    y: Math.round(y + i * size * LINE_HEIGHT),
    size,
    strike,
  }));
}
