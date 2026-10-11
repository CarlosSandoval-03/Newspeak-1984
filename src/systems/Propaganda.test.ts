import { beforeEach, describe, expect, it } from "vitest";
import { resetGame, state } from "../state";
import { ALERT, type Word } from "../types";
import { Propaganda, type WordClocks } from "./Propaganda";

describe("Propaganda", () => {
  let clocks: WordClocks;
  let propaganda: Propaganda;
  const view = (word: Word) =>
    propaganda.displayedWords().find((view) => view.word === word)!;

  beforeEach(() => {
    resetGame();
    clocks = {
      dashReady: () => true,
      truthReady: () => true,
      truthLeft: () => 0,
    };
    propaganda = new Propaganda(clocks);
  });

  it("passes the real values through, for now", () => {
    state.realLives = 2;
    state.suspicion = 42;
    state.alertLevel = ALERT.alert;

    expect(propaganda.displayedLives()).toBe(2);
    expect(propaganda.displayedSuspicion()).toBe(42);
    expect(propaganda.displayedAlert()).toBe(ALERT.alert);
  });

  it("shows the official record, plus what this level has earned until it is judged", () => {
    state.officialScore = 3000;
    state.levelStartScore = 2500;
    state.realScore = 2500 + 700;

    expect(propaganda.displayedScore()).toBe(3700);
  });

  describe("the words row", () => {
    it("lists the words in the order the Party takes them", () => {
      expect(propaganda.displayedWords().map(({ word }) => word)).toEqual([
        "FREE",
        "ESCAPE",
        "REMEMBER",
        "TRUTH",
      ]);
    });

    it("shows a sleeping word without pips, and an awake one with its level", () => {
      expect(view("FREE")).toMatchObject({ status: "dormant", pips: 0 });

      state.wordLevels.FREE = 2;
      expect(view("FREE")).toMatchObject({ status: "ready", pips: 2 });
    });

    it("strikes a removed word, whatever level it had", () => {
      state.wordLevels.FREE = 3;
      state.words.delete("FREE");

      expect(view("FREE")).toMatchObject({ status: "removed", pips: 0 });
    });

    it("shows ESCAPE and TRUTH recharging until their clocks say ready", () => {
      state.wordLevels.ESCAPE = 1;
      state.wordLevels.TRUTH = 1;
      clocks.dashReady = () => false;
      clocks.truthReady = () => false;

      expect(view("ESCAPE")).toMatchObject({ status: "recharging", pips: 1 });
      expect(view("TRUTH")).toMatchObject({ status: "recharging", pips: 1 });
    });

    it("shows TRUTH active with the share of its time left", () => {
      state.wordLevels.TRUTH = 1;
      clocks.truthLeft = () => 0.25;

      expect(view("TRUTH")).toMatchObject({ status: "active", timeLeft: 0.25 });
    });

    it("counts REMEMBER's pips as bombs left and spent", () => {
      state.wordLevels.REMEMBER = 3;
      state.bombs = 1;

      expect(view("REMEMBER")).toMatchObject({
        status: "ready",
        pips: 1,
        spent: 2,
      });
    });

    it("marks the word a diary gave back", () => {
      state.wordLevels.ESCAPE = 2;
      state.restoredWord = "ESCAPE";

      expect(view("ESCAPE")).toMatchObject({ status: "ready", restored: true });
      expect(view("FREE").restored).toBe(false);
    });
  });
});
