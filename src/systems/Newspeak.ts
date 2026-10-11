import {
  PICKUP_BONUS_SCORE,
  REMOVED_PICKUP_SUSPICION,
  TRUTH_COOLDOWN_FRAMES,
  TRUTH_DURATION_FRAMES,
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
  private truthFrames = 0;
  private truthDuration = 0;
  private truthCooldown = 0;

  constructor(suspicion: Suspicion) {
    this.suspicion = suspicion;
  }

  get truthActive(): boolean {
    return this.truthFrames > 0;
  }

  // The share of this truth still to come, from 1 down to 0; 0 while none is active.
  get truthLeft(): number {
    return this.truthActive ? this.truthFrames / this.truthDuration : 0;
  }

  get truthReady(): boolean {
    return !this.truthActive && this.truthCooldown === 0;
  }

  // The cooldown starts once the truth fades, so a longer TRUTH never shortens the wait.
  update(): void {
    if (this.truthFrames > 0) {
      if (--this.truthFrames === 0) this.truthCooldown = TRUTH_COOLDOWN_FRAMES;
    } else if (this.truthCooldown > 0) this.truthCooldown--;
  }

  // Only an awake TRUTH shows anything, and only once it is ready again.
  revealTruth(): void {
    const level = state.words.has("TRUTH") ? state.wordLevels.TRUTH : 0;
    if (level === 0 || this.truthActive || this.truthCooldown > 0) return;

    this.truthDuration = TRUTH_DURATION_FRAMES[level - 1];
    this.truthFrames = this.truthDuration;
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
