import type p5 from "p5";
import { PAPER, STRIKE_FRAMES } from "../config";
import { t } from "../i18n";
import type { HonorRollEntry, Tampering } from "../systems/HonorRoll";
import { drawStrike, scoreDigits, Typewriter } from "./effects";

// Wide enough for the longest name in any language, so the scores line up in the machine's
// monospaced face.
const NAME_COLUMNS = 14;
const ROW_STEP = 22;

// One row per entry, in the current language: the place, the pilot or the unperson, the score.
export function honorRollRows(entries: readonly HonorRollEntry[]): string[] {
  return entries.map(({ pilotId, score, unperson }, i) => {
    const place = `${String(i + 1).padStart(2)}.`;
    const name = unperson
      ? t("honorRoll.unperson")
      : t("honorRoll.pilot", { id: pilotId });
    return `${place} ${name.padEnd(NAME_COLUMNS)} ${scoreDigits(score)}`;
  });
}

// The title, then the rows centered under it, or a note that the archive is empty; in the current
// font and size.
export function drawHonorRoll(
  p: p5,
  entries: readonly HonorRollEntry[],
  center: number,
  top: number,
): void {
  const rows = honorRollRows(entries);

  p.textAlign(p.CENTER, p.BASELINE);
  p.fill(PAPER);
  p.text(t("honorRoll.title"), center, top);
  if (rows.length === 0)
    p.text(t("honorRoll.empty"), center, top + ROW_STEP * 2);
  rows.forEach((row, i) => p.text(row, center, top + ROW_STEP * (i + 2)));
}

// The archive as it stood, typed out, then changed in front of the pilot one row at a time: each
// row the Ministry touched is struck through, then retyped as the Ministry left it.
export class TamperedHonorRoll {
  // The title, then the rows as they stood, or the note that there are none.
  private readonly lines: string[];
  // The rows as the Ministry left them, lined up with `lines` under the title.
  private readonly after: string[];
  // Indexes into `lines` of the rows that changed, in the order they are touched.
  private readonly changed: number[];
  private readonly typing: Typewriter;
  private current = 0;
  private strikeAge = 0;
  private retyping: Typewriter | null = null;

  constructor({ before, after }: Tampering) {
    const rows = honorRollRows(before);

    this.lines = [
      t("honorRoll.title"),
      ...(rows.length > 0 ? rows : [t("honorRoll.empty")]),
    ];
    this.after = ["", ...honorRollRows(after)];
    this.changed = rows.flatMap((row, i) =>
      row === this.after[i + 1] ? [] : [i + 1],
    );
    this.typing = new Typewriter(this.lines);
  }

  get done(): boolean {
    return this.typing.done && this.current === this.changed.length;
  }

  // The table is typed first; then each changed row in turn is struck, then retyped.
  update(): void {
    if (!this.typing.done) this.typing.update();
    else if (this.current < this.changed.length) this.tamperRow();
  }

  finish(): void {
    this.typing.finish();
    this.current = this.changed.length;
    this.retyping = null;
  }

  // Centered in the current font and size, which should be the machine's.
  draw(p: p5, center: number, top: number): void {
    p.textAlign(p.LEFT, p.BASELINE);
    this.lines.forEach((text, line) => {
      const y = line === 0 ? top : top + ROW_STEP * (line + 1);
      const x = Math.round(center - p.textWidth(text) / 2);

      p.fill(PAPER);
      p.text(this.shown(line), x, y);
      const strike = this.struck(line);
      if (strike > 0)
        drawStrike(p, { x, y, size: p.textSize() }, p.textWidth(text) * strike);
    });
  }

  // Strikes the current row out, retypes it, then moves on to the next.
  private tamperRow(): void {
    if (this.strikeAge < STRIKE_FRAMES) {
      this.strikeAge++;
      return;
    }

    this.retyping ??= new Typewriter([this.after[this.changed[this.current]]]);
    this.retyping.update();
    if (!this.retyping.done) return;

    this.current++;
    this.strikeAge = 0;
    this.retyping = null;
  }

  // A touched row shows as the Ministry left it, the row being retyped as far as it has got, and
  // any other row as typed.
  private shown(line: number): string {
    const turn = this.changed.indexOf(line);
    if (turn === -1 || turn > this.current) return this.typing.shown(line);
    if (turn < this.current) return this.after[line];
    return this.retyping ? this.retyping.shown(0) : this.typing.shown(line);
  }

  // How much of the line is struck through: only the current row, until it is retyped.
  private struck(line: number): number {
    const current = this.changed[this.current] === line && !this.retyping;
    return current ? this.strikeAge / STRIKE_FRAMES : 0;
  }
}
