import { ALLIANCE_FLIP_AT, WORD_REMOVAL_ORDER } from "../config";
import { state } from "../state";
import type { AlertLevel, Enemy, Word } from "../types";
import { standingScore } from "./Ministry";

// The clocks of the timed words, which live on the pilot and in Newspeak, not in the game state.
export interface WordClocks {
  dashReady(): boolean;
  truthReady(): boolean;
  truthLeft(): number;
}

// One word of the row, as the HUD draws it.
export interface WordView {
  word: Word;
  status: "dormant" | "ready" | "recharging" | "active" | "removed";
  // Filled pips: the upgrade level, or for REMEMBER the bombs left.
  pips: number;
  // REMEMBER's bombs already used this level.
  spent: number;
  restored: boolean;
  // While TRUTH is active, the share of its time left.
  timeLeft: number;
}

// The values the regime has lied about so far; the rest are still told straight.
export type LieField = "ticker";

const ENEMIES: readonly Enemy[] = ["eurasia", "eastasia"];

// What the HUD and the ticker are allowed to show. The lies escalate level by level, and while
// TRUTH is active every value is the real one.
export class Propaganda {
  private readonly clocks: WordClocks;
  private readonly level: number;
  private flipped = false;

  constructor(clocks: WordClocks, level = state.level) {
    this.clocks = clocks;
    this.level = level;
  }

  // The enemy Oceania is at war with now, which it has always been. The war has changed sides once
  // a level so far, and once more halfway through this one.
  get enemy(): Enemy {
    const flips = this.level - 1 + (this.flipped ? 1 : 0);
    return ENEMIES[flips % ENEMIES.length];
  }

  private get telling(): boolean {
    return this.clocks.truthLeft() > 0;
  }

  // `progress` is the share of the level flown.
  update(progress: number): void {
    if (progress >= ALLIANCE_FLIP_AT) this.flipped = true;
  }

  // Every line names the enemy of the moment; TRUTH shows the one it was written with.
  displayedEnemy(written: Enemy): Enemy {
    return this.telling ? written : this.enemy;
  }

  // Whether what is on screen for `field` is false right now.
  isLying(field: LieField): boolean {
    return field === "ticker" && this.flipped && !this.telling;
  }

  displayedLives(): number {
    return state.realLives;
  }

  displayedScore(): number {
    return standingScore();
  }

  displayedSuspicion(): number {
    return state.suspicion;
  }

  displayedAlert(): AlertLevel {
    return state.alertLevel;
  }

  // In the order the Party takes them, so the row empties from the left.
  displayedWords(): WordView[] {
    return WORD_REMOVAL_ORDER.map((word) => this.view(word));
  }

  private view(word: Word): WordView {
    const level = state.wordLevels[word];
    const restored = state.restoredWord === word;
    const base = { word, pips: level, spent: 0, restored, timeLeft: 0 };

    if (!state.words.has(word))
      return { ...base, status: "removed", pips: 0, restored: false };
    if (level === 0) return { ...base, status: "dormant" };
    if (word === "REMEMBER")
      return {
        ...base,
        status: "ready",
        pips: state.bombs,
        spent: Math.max(0, level - state.bombs),
      };
    if (word === "TRUTH" && this.telling)
      return { ...base, status: "active", timeLeft: this.clocks.truthLeft() };

    const ready =
      word === "ESCAPE"
        ? this.clocks.dashReady()
        : word === "TRUTH"
          ? this.clocks.truthReady()
          : true;
    return { ...base, status: ready ? "ready" : "recharging" };
  }
}
