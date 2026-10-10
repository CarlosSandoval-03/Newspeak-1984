import { beforeEach, describe, expect, it } from "vitest";
import { resetGame, state } from "../state";
import { Newspeak, removedAt } from "./Newspeak";

const available = () => [...state.words].sort();

describe("Newspeak", () => {
  let newspeak: Newspeak;

  beforeEach(() => {
    resetGame();
    newspeak = new Newspeak();
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
});
