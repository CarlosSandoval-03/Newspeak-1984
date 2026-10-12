import type p5 from "p5";
import { PAPER } from "../config";
import { t } from "../i18n";
import type { HonorRollEntry } from "../systems/HonorRoll";
import { scoreDigits } from "./effects";

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
