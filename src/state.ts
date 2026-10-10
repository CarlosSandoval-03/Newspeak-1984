import { STARTING_LIVES } from "./config";
import { ALERT, type GameState, type Stats } from "./types";

const freshStats = (): Stats => ({
  kills: 0,
  eyesDestroyed: 0,
  framesSeen: 0,
  diaries: 0,
});

function freshRun(): GameState {
  return {
    // A new pilot every run, so the honor roll never repeats a name.
    pilotId: String(1 + Math.floor(Math.random() * 9999)).padStart(4, "0"),
    level: 1,
    realLives: STARTING_LIVES,
    realScore: 0,
    suspicion: 0,
    alertLevel: ALERT.normal,
    words: new Set(["FREE", "ESCAPE", "TRUTH", "REMEMBER"]),
    // Every word is known from the start, so the pilot sees what can be taken, but each one
    // sleeps until its first pickup, so its power is earned before it is lost.
    wordLevels: { FREE: 0, ESCAPE: 0, TRUTH: 0, REMEMBER: 0 },
    restoredWord: null,
    bombs: 0,
    stats: freshStats(),
    runStats: { ...freshStats(), pagesRead: [] },
  };
}

export const state: GameState = freshRun();

// Mutates in place, so every module holding `state` sees the new run.
export function resetGame(): void {
  Object.assign(state, freshRun());
}

// Counted for the level and the run at once, so the two totals can never drift apart.
export function record(stat: keyof Stats): void {
  state.stats[stat]++;
  state.runStats[stat]++;
}

// A diary's word was given back for one level only; removal itself is permanent.
export function resetLevelState(): void {
  state.stats = freshStats();
  if (state.restoredWord) state.words.delete(state.restoredWord);
  state.restoredWord = null;
  state.bombs = state.words.has("REMEMBER") ? state.wordLevels.REMEMBER : 0;
}
