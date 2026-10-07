import { STARTING_LIVES } from "./config";
import { ALERT, type GameState } from "./types";

const freshStats = () => ({
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
    stats: freshStats(),
  };
}

export const state: GameState = freshRun();

// Mutates in place, so every module holding `state` sees the new run.
export function resetGame(): void {
  Object.assign(state, freshRun());
}

export function resetLevelState(): void {
  state.stats = freshStats();
}
