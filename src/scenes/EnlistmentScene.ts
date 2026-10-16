import type p5 from "p5";
import { CANVAS_WIDTH, INK, PAPER } from "../config";
import type { Scene } from "../core/Scene";
import type { SceneManager } from "../core/SceneManager";
import { currentStrings, format, t } from "../i18n";
import { state } from "../state";
import {
  drawCursor,
  drawStamp,
  type PageLine,
  stack,
  Typewriter,
  wrap,
} from "../ui/effects";
import { DictionaryScene } from "./DictionaryScene";

// The portrait at 3× on the left, the file's entries in a column to its right, the note below both.
const MARGIN = 24;
const HEADER_Y = 56;
const PORTRAIT = { x: MARGIN, y: 112, scale: 3 };
const COLUMN_X = 240;
const RANK_Y = 152;
const NUMBER_Y = 200;
const FIELDS_Y = 240;
const NOTE_Y = 352;
const NOTE_COLUMNS = 45;
const HEADING_SIZE = 20;
const NUMBER_SIZE = 40;
const PROSE_SIZE = 16;
// Pressed across the bottom of the photo, as on an identity card.
const STAMP_CENTER = { x: MARGIN + 96, y: 280 };
const STAMP_SIZE = 40;
const PROMPT_Y = 600;
const PROMPT_SIZE = 20;

// The pilot's personnel file, opened as a run begins: the portrait, the number drawn for this run in
// place of a name, and the regime's welcome, typed out and stamped. Enter first finishes the page,
// then goes on to the first Dictionary.
export class EnlistmentScene implements Scene {
  private readonly p: p5;
  private readonly manager: SceneManager;
  private readonly lines: PageLine[];
  private readonly typewriter: Typewriter;

  constructor(p: p5, manager: SceneManager) {
    this.p = p;
    this.manager = manager;
    this.lines = page();
    this.typewriter = new Typewriter(this.lines.map(({ text }) => text));
  }

  enter(): void {}

  update(): void {
    if (this.manager.input.wasPressed("confirm")) {
      if (this.typewriter.done) {
        this.manager.change(new DictionaryScene(this.p, this.manager));
        return;
      }
      this.typewriter.finish();
    }
    this.typewriter.update();
  }

  // The portrait, the file typed so far with its cursor, then the stamp and the prompt once typed.
  draw(): void {
    const { p } = this;
    const { font, image } = this.manager.assets;
    const portrait = image["pilot-portrait"];

    p.background(INK);
    p.imageMode(p.CORNER);
    p.image(
      portrait,
      PORTRAIT.x,
      PORTRAIT.y,
      portrait.width * PORTRAIT.scale,
      portrait.height * PORTRAIT.scale,
    );

    p.noStroke();
    p.fill(PAPER);
    p.textFont(font.paperwork);
    p.textAlign(p.LEFT, p.BASELINE);
    this.lines.forEach(({ x, y, size }, i) => {
      p.textSize(size);
      p.text(this.typewriter.shown(i), x, y);
    });
    if (!this.typewriter.done) {
      if (this.typewriter.cursorVisible)
        drawCursor(p, this.lines, this.typewriter);
      return;
    }

    p.textFont(font.machine);
    drawStamp(p, t("enlistment.stamp"), STAMP_CENTER, STAMP_SIZE);
    p.textSize(PROMPT_SIZE);
    p.textAlign(p.CENTER, p.BASELINE);
    p.fill(PAPER);
    p.text(t("enlistment.pressEnter"), CANVAS_WIDTH / 2, PROMPT_Y);
  }

  exit(): void {}
}

// The file's lines in the order they are typed: the header, then the entries beside the portrait,
// then the note under it.
function page(): PageLine[] {
  const { header, department, rank, fields, note } =
    currentStrings().enlistment;
  const column = (texts: string[], y: number, size: number) =>
    stack(texts, { x: COLUMN_X, y, size });

  return [
    ...stack([header, department], {
      x: MARGIN,
      y: HEADER_Y,
      size: HEADING_SIZE,
    }),
    ...column([rank], RANK_Y, HEADING_SIZE),
    ...column([state.pilotId], NUMBER_Y, NUMBER_SIZE),
    ...column(fields, FIELDS_Y, PROSE_SIZE),
    ...stack(wrap(format(note, { id: state.pilotId }), NOTE_COLUMNS), {
      x: MARGIN,
      y: NOTE_Y,
      size: PROSE_SIZE,
    }),
  ];
}
