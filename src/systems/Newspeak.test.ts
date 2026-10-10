import { beforeEach, describe, expect, it } from "vitest";
import {
  PICKUP_BONUS_SCORE,
  REMOVED_PICKUP_SUSPICION,
  WORD_MAX_LEVEL,
} from "../config";
import { resetGame, state } from "../state";
import { Newspeak, removedAt } from "./Newspeak";
import { Suspicion } from "./Suspicion";

const available = () => [...state.words].sort();

describe("Newspeak", () => {
  let newspeak: Newspeak;

  beforeEach(() => {
    resetGame();
    newspeak = new Newspeak(new Suspicion());
  });

  it("removes nothing in level 1", () => {
    newspeak.applyLevel(1);

    expect(available()).toEqual(["ESCAPE", "FREE", "REMEMBER", "TRUTH"]);
    expect(removedAt(1)).toBeNull();
  });

  it("removes one word per level, in order, until none is left", () => {
    const left = [
      ["ESCAPE", "REMEMBER", "TRUTH"],
      ["REMEMBER", "TRUTH"],
      ["TRUTH"],
      [],
    ];

    left.forEach((words, i) => {
      newspeak.applyLevel(i + 2);
      expect(available()).toEqual(words);
    });
    expect([2, 3, 4, 5].map(removedAt)).toEqual([
      "FREE",
      "ESCAPE",
      "REMEMBER",
      "TRUTH",
    ]);
  });

  it("takes every earlier word too when a run starts later", () => {
    newspeak.applyLevel(4);

    expect(available()).toEqual(["TRUTH"]);
  });

  it("keeps a removed word's level, for a diary to give back", () => {
    state.wordLevels.FREE = 3;

    newspeak.applyLevel(2);

    expect(state.wordLevels.FREE).toBe(3);
  });

  describe("collecting a pickup", () => {
    it("wakes a dormant word, then upgrades it up to the top", () => {
      for (let level = 1; level <= WORD_MAX_LEVEL; level++) {
        newspeak.collect("FREE");
        expect(state.wordLevels.FREE).toBe(level);
      }
      expect(state.realScore).toBe(0);
    });

    it("pays a bonus instead once the word is at the top", () => {
      state.wordLevels.ESCAPE = WORD_MAX_LEVEL;

      newspeak.collect("ESCAPE");

      expect(state.wordLevels.ESCAPE).toBe(WORD_MAX_LEVEL);
      expect(state.realScore).toBe(PICKUP_BONUS_SCORE);
    });

    it("hands over REMEMBER's new bomb at once", () => {
      newspeak.collect("REMEMBER");
      newspeak.collect("REMEMBER");

      expect(state.bombs).toBe(2);
    });

    it("gives nothing for a removed word, and raises suspicion", () => {
      newspeak.applyLevel(2);

      newspeak.collect("FREE");

      expect(state.wordLevels.FREE).toBe(0);
      expect(state.realScore).toBe(0);
      expect(state.suspicion).toBe(REMOVED_PICKUP_SUSPICION);
    });
  });
});
