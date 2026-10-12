import {
  ALLIANCE_FLIP_AT,
  FAKE_LIFE_FRAMES,
  FAKE_LIFE_HIDDEN_MAX,
  FAKE_LIFE_HIDDEN_MIN,
  LIE_FROM,
  SCORE_INFLATION_MAX,
  SCORE_INFLATION_MIN,
  WORD_REMOVAL_ORDER,
} from "../config";
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

// The values the regime lies about; the rest are told straight.
export const LIE_FIELDS = ["ticker", "score", "lives"] as const;
export type LieField = (typeof LIE_FIELDS)[number];

const ENEMIES: readonly Enemy[] = ["eurasia", "eastasia"];

// What the HUD and the ticker are allowed to show. The lies escalate level by level, and while
// TRUTH is active every value is the real one.
export class Propaganda {
  private readonly clocks: WordClocks;
  private readonly level: number;
  private readonly random: () => number;
  private readonly inflation: number;
  private flipped = false;
  private fakeLife = 0;
  private fakeLifeIn: number;

  constructor(clocks: WordClocks, level = state.level, random = Math.random) {
    this.clocks = clocks;
    this.level = level;
    this.random = random;
    this.inflation =
      SCORE_INFLATION_MIN +
      random() * (SCORE_INFLATION_MAX - SCORE_INFLATION_MIN);
    this.fakeLifeIn = this.hiddenFor();
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

  // `progress` is the share of the level flown: halfway through, the war changes sides. The extra
  // life comes and goes on its own clock.
  update(progress: number): void {
    if (this.lies("ticker") && progress >= ALLIANCE_FLIP_AT)
      this.flipped = true;
    if (this.lies("lives")) this.countFakeLife();
  }

  // Every line names the enemy of the moment; TRUTH shows the one it was written with.
  displayedEnemy(written: Enemy): Enemy {
    return this.telling ? written : this.enemy;
  }

  // Whether what is on screen for `field` is false right now.
  isLying(field: LieField): boolean {
    if (this.telling) return false;
    if (field === "ticker") return this.flipped;
    if (field === "lives") return this.fakeLife > 0;
    return this.lies("score") && this.inflatedScore() !== standingScore();
  }

  displayedLives(): number {
    return state.realLives + (this.isLying("lives") ? 1 : 0);
  }

  displayedScore(): number {
    return this.isLying("score") ? this.inflatedScore() : standingScore();
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

  private lies(field: LieField): boolean {
    return this.level >= LIE_FROM[field];
  }

  private inflatedScore(): number {
    return Math.round(standingScore() * this.inflation);
  }

  // Shown for a while, then hidden until a random time later.
  private countFakeLife(): void {
    if (this.fakeLife > 0) {
      if (--this.fakeLife === 0) this.fakeLifeIn = this.hiddenFor();
      return;
    }
    if (--this.fakeLifeIn <= 0) this.fakeLife = FAKE_LIFE_FRAMES;
  }

  private hiddenFor(): number {
    return Math.round(
      FAKE_LIFE_HIDDEN_MIN +
        this.random() * (FAKE_LIFE_HIDDEN_MAX - FAKE_LIFE_HIDDEN_MIN),
    );
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
