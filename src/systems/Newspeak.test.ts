import { beforeEach, describe, expect, it } from "vitest";
import {
  PICKUP_BONUS_SCORE,
  REMOVED_PICKUP_SUSPICION,
  TRUTH_COOLDOWN_FRAMES,
  TRUTH_DURATION_FRAMES,
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

  describe("TRUTH", () => {
    const ticks = (n: number) => {
      for (let i = 0; i < n; i++) newspeak.update();
    };

    it("shows nothing while the word sleeps, or once it is removed", () => {
      newspeak.revealTruth();
      expect(newspeak.truthActive).toBe(false);

      state.wordLevels.TRUTH = 1;
      state.words.delete("TRUTH");
      newspeak.revealTruth();
      expect(newspeak.truthActive).toBe(false);
    });

    it("lasts longer at each upgrade", () => {
      for (let level = 1; level <= TRUTH_DURATION_FRAMES.length; level++) {
        newspeak = new Newspeak(new Suspicion());
        state.wordLevels.TRUTH = level;

        newspeak.revealTruth();
        ticks(TRUTH_DURATION_FRAMES[level - 1] - 1);
        expect(newspeak.truthActive, `level ${level}`).toBe(true);
        ticks(1);
        expect(newspeak.truthActive, `level ${level}`).toBe(false);
      }
    });

    it("waits out its cooldown from when the truth fades", () => {
      state.wordLevels.TRUTH = 1;
      newspeak.revealTruth();
      ticks(TRUTH_DURATION_FRAMES[0]);

      ticks(TRUTH_COOLDOWN_FRAMES - 1);
      newspeak.revealTruth();
      expect(newspeak.truthActive).toBe(false);

      ticks(1);
      newspeak.revealTruth();
      expect(newspeak.truthActive).toBe(true);
    });

    it("tells the words row how much is left, and when it is ready", () => {
      state.wordLevels.TRUTH = 1;
      const duration = TRUTH_DURATION_FRAMES[0];
      expect(newspeak.truthReady).toBe(true);
      expect(newspeak.truthLeft).toBe(0);

      newspeak.revealTruth();
      expect(newspeak.truthLeft).toBe(1);
      ticks(duration / 2);
      expect(newspeak.truthLeft).toBeCloseTo(0.5);
      expect(newspeak.truthReady).toBe(false);

      ticks(duration / 2);
      expect(newspeak.truthLeft).toBe(0);
      expect(newspeak.truthReady).toBe(false);
      ticks(TRUTH_COOLDOWN_FRAMES);
      expect(newspeak.truthReady).toBe(true);
    });

    it("can't be stretched by asking again while it lasts", () => {
      state.wordLevels.TRUTH = 1;
      newspeak.revealTruth();
      ticks(TRUTH_DURATION_FRAMES[0] - 1);

      newspeak.revealTruth();
      ticks(1);

      expect(newspeak.truthActive).toBe(false);
    });
  });
});
