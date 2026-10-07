import { afterEach, describe, expect, it, vi } from "vitest";
import { STARTING_LIVES } from "./config";
import { resetGame, resetLevelState, state } from "./state";
import { ALERT } from "./types";

describe("state", () => {
  afterEach(() => vi.restoreAllMocks());

  it("starts a fresh run on the same object", () => {
    const before = state;
    state.level = 4;
    state.realLives = 0;
    state.realScore = 9000;
    state.suspicion = 80;
    state.alertLevel = ALERT.thoughtPolice;
    state.words.clear();
    state.stats.kills = 12;

    resetGame();

    expect(state).toBe(before);
    expect(state).toMatchObject({
      level: 1,
      realLives: STARTING_LIVES,
      realScore: 0,
      suspicion: 0,
      alertLevel: ALERT.normal,
      stats: { kills: 0, eyesDestroyed: 0, framesSeen: 0, diaries: 0 },
    });
    expect([...state.words].sort()).toEqual([
      "ESCAPE",
      "FREE",
      "REMEMBER",
      "TRUTH",
    ]);
  });

  it("draws a zero-padded pilot ID from 0001 to 9999", () => {
    vi.spyOn(Math, "random").mockReturnValueOnce(0).mockReturnValueOnce(0.9999);

    resetGame();
    expect(state.pilotId).toBe("0001");

    resetGame();
    expect(state.pilotId).toBe("9999");
  });

  it("clears only the level's stats between levels", () => {
    resetGame();
    state.realLives = 1;
    state.realScore = 500;
    state.suspicion = 40;
    state.stats = { kills: 7, eyesDestroyed: 2, framesSeen: 300, diaries: 1 };

    resetLevelState();

    expect(state.stats).toEqual({
      kills: 0,
      eyesDestroyed: 0,
      framesSeen: 0,
      diaries: 0,
    });
    expect(state).toMatchObject({
      realLives: 1,
      realScore: 500,
      suspicion: 40,
    });
  });
});
