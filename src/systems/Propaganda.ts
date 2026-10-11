import { WORD_REMOVAL_ORDER } from "../config";
import { state } from "../state";
import type { AlertLevel, Word } from "../types";

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

// Tells the truth for now. The HUD already asks here, so the lies can arrive without touching it.
export class Propaganda {
  private readonly clocks: WordClocks;

  constructor(clocks: WordClocks) {
    this.clocks = clocks;
  }

  displayedLives(): number {
    return state.realLives;
  }

  // The Ministry's record so far, plus what this level has earned until it is judged.
  displayedScore(): number {
    return state.officialScore + state.realScore - state.levelStartScore;
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
    if (word === "TRUTH" && this.clocks.truthLeft() > 0)
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
