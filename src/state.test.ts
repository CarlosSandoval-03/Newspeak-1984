import { afterEach, describe, expect, it, vi } from "vitest";
import { STARTING_LIVES } from "./config";
import { record, resetGame, resetLevelState, state } from "./state";
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

  it("starts every word at level 1, with one bomb", () => {
    state.wordLevels.FREE = 3;
    state.bombs = 0;

    resetGame();

    expect(state.wordLevels).toEqual({
      FREE: 1,
      ESCAPE: 1,
      TRUTH: 1,
      REMEMBER: 1,
    });
    expect(state.bombs).toBe(1);
    expect(state.restoredWord).toBeNull();
  });

  it("clears only the level's stats between levels", () => {
    resetGame();
    state.realLives = 1;
    state.realScore = 500;
    state.suspicion = 40;
    state.stats = { kills: 7, eyesDestroyed: 2, framesSeen: 300, diaries: 1 };
    state.runStats.kills = 30;
    state.runStats.pagesRead = [1];
    state.wordLevels.FREE = 2;

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
      runStats: { kills: 30, pagesRead: [1] },
      wordLevels: { FREE: 2 },
    });
  });

  it("takes back a diary's word, but not the words removal left", () => {
    resetGame();
    state.words = new Set(["REMEMBER", "TRUTH", "ESCAPE"]);
    state.restoredWord = "ESCAPE";

    resetLevelState();

    expect([...state.words].sort()).toEqual(["REMEMBER", "TRUTH"]);
    expect(state.restoredWord).toBeNull();
  });

  it("refills the bombs to REMEMBER's level, or none without the word", () => {
    resetGame();
    state.wordLevels.REMEMBER = 3;
    state.bombs = 0;

    resetLevelState();
    expect(state.bombs).toBe(3);

    state.words.delete("REMEMBER");
    resetLevelState();
    expect(state.bombs).toBe(0);
  });

  it("records a stat for the level and the run together", () => {
    resetGame();
    record("kills");
    resetLevelState();
    record("kills");

    expect(state.stats.kills).toBe(1);
    expect(state.runStats.kills).toBe(2);
  });
});
