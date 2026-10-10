import {
  PICKUP_BONUS_SCORE,
  REMOVED_PICKUP_SUSPICION,
  WORD_MAX_LEVEL,
  WORD_REMOVAL_ORDER,
} from "../config";
import { state } from "../state";
import type { Word } from "../types";
import type { Suspicion } from "./Suspicion";

// The word the Party takes away as this level begins; none in level 1.
export function removedAt(level: number): Word | null {
  return WORD_REMOVAL_ORDER[level - 2] ?? null;
}

// Owns which words the pilot still has, and what they are worth.
export class Newspeak {
  private readonly suspicion: Suspicion;

  constructor(suspicion: Suspicion) {
    this.suspicion = suspicion;
  }

  // Takes every word due by this level, not just this level's, so a run can start from any level.
  applyLevel(level: number): void {
    for (const word of WORD_REMOVAL_ORDER.slice(0, Math.max(0, level - 1)))
      state.words.delete(word);
  }

  // The first pickup wakes a word and the rest upgrade it; a removed word gives nothing but notice.
  collect(word: Word): void {
    if (!state.words.has(word)) {
      this.suspicion.add(REMOVED_PICKUP_SUSPICION);
      return;
    }

    if (state.wordLevels[word] >= WORD_MAX_LEVEL) {
      state.realScore += PICKUP_BONUS_SCORE;
      return;
    }

    state.wordLevels[word]++;
    // REMEMBER's level is the bombs per level, so the new one is also there to use now.
    if (word === "REMEMBER") state.bombs++;
  }
}
