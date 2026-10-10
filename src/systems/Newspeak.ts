import { WORD_REMOVAL_ORDER } from "../config";
import { state } from "../state";
import type { Word } from "../types";

// The word the Party takes away as this level begins; none in level 1.
export function removedAt(level: number): Word | null {
  return WORD_REMOVAL_ORDER[level - 2] ?? null;
}

// Owns which words the pilot still has, and what they are worth.
export class Newspeak {
  // Takes every word due by this level, not just this level's, so a run can start from any level.
  applyLevel(level: number): void {
    for (const word of WORD_REMOVAL_ORDER.slice(0, Math.max(0, level - 1)))
      state.words.delete(word);
  }
}
