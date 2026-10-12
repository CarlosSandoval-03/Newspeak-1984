import { beforeEach, describe, expect, it } from "vitest";
import {
  ALLIANCE_FLIP_AT,
  ALLIED_SHARE,
  ALLIED_TELL_PERIOD,
  FAKE_LIFE_FRAMES,
  FAKE_LIFE_HIDDEN_MAX,
  FAKE_LIFE_HIDDEN_MIN,
  SCORE_INFLATION_MIN,
} from "../config";
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

  describe("the war", () => {
    let truth: number;
    const atLevel = (level: number) =>
      new Propaganda({ ...clocks, truthLeft: () => truth }, level);

    beforeEach(() => {
      truth = 0;
    });

    it("changes sides once a level, halfway through it", () => {
      const first = atLevel(1);
      expect(first.enemy).toBe("eurasia");
      first.update(ALLIANCE_FLIP_AT - 0.01);
      expect(first.enemy).toBe("eurasia");
      first.update(ALLIANCE_FLIP_AT);
      expect(first.enemy).toBe("eastasia");

      expect(atLevel(2).enemy).toBe("eastasia");
      expect(atLevel(3).enemy).toBe("eurasia");
    });

    it("names the enemy of the moment in every line, and TRUTH the one it was written with", () => {
      const war = atLevel(1);
      war.update(1);

      expect(war.displayedEnemy("eurasia")).toBe("eastasia");
      truth = 0.5;
      expect(war.displayedEnemy("eurasia")).toBe("eurasia");
    });

    it("lies on the ticker once the war has changed sides, unless TRUTH is active", () => {
      const war = atLevel(1);
      expect(war.isLying("ticker")).toBe(false);

      war.update(1);
      expect(war.isLying("ticker")).toBe(true);
      truth = 0.5;
      expect(war.isLying("ticker")).toBe(false);
    });

    it("rewrites a slogan into its opposite with the war, and TRUTH shows it as written", () => {
      const war = atLevel(1);
      const pair = ["ALWAYS OUR ALLY", "NEVER OUR ALLY"];
      expect(war.displayedSlogan(pair)).toBe("ALWAYS OUR ALLY");

      war.update(ALLIANCE_FLIP_AT);
      expect(war.displayedSlogan(pair)).toBe("NEVER OUR ALLY");
      truth = 0.5;
      expect(war.displayedSlogan(pair)).toBe("ALWAYS OUR ALLY");
    });
  });

  describe("the numbers", () => {
    let truth: number;
    // Every draw at the bottom of its range: the least inflation, the shortest wait.
    const atLevel = (level: number) =>
      new Propaganda({ ...clocks, truthLeft: () => truth }, level, () => 0);

    beforeEach(() => {
      truth = 0;
      state.realScore = 1000;
    });

    it("inflates the score from level 2, and TRUTH shows the real one", () => {
      expect(atLevel(1).displayedScore()).toBe(1000);
      expect(atLevel(1).isLying("score")).toBe(false);

      const level2 = atLevel(2);
      expect(level2.displayedScore()).toBe(
        Math.round(1000 * SCORE_INFLATION_MIN),
      );
      expect(level2.isLying("score")).toBe(true);

      truth = 0.5;
      expect(level2.displayedScore()).toBe(1000);
      expect(level2.isLying("score")).toBe(false);
    });

    it("tells no lie about a score of nothing", () => {
      state.realScore = 0;
      expect(atLevel(2).isLying("score")).toBe(false);
    });

    it("shows an extra life from level 3, for a while, then hides it until later", () => {
      const level3 = atLevel(3);
      const lives = () => level3.displayedLives() - state.realLives;

      for (let i = 1; i < FAKE_LIFE_HIDDEN_MIN; i++) level3.update(0);
      expect(lives()).toBe(0);
      level3.update(0);
      expect(lives()).toBe(1);
      expect(level3.isLying("lives")).toBe(true);

      truth = 0.5;
      expect(lives()).toBe(0);
      truth = 0;

      for (let i = 0; i < FAKE_LIFE_FRAMES; i++) level3.update(0);
      expect(lives()).toBe(0);
    });

    it("never shows an extra life before level 3", () => {
      const level2 = atLevel(2);
      for (let i = 0; i < 2 * FAKE_LIFE_HIDDEN_MAX; i++) level2.update(0);
      expect(level2.displayedLives()).toBe(state.realLives);
    });
  });

  describe("the allies", () => {
    let truth: number;
    let draws: number[];
    const atLevel = (level: number) =>
      new Propaganda(
        { ...clocks, truthLeft: () => truth },
        level,
        () => draws.shift() ?? 0,
      );

    beforeEach(() => {
      truth = 0;
      // The inflation and the fake life's first wait, then each disguise's roll and phase.
      draws = [0, 0];
    });

    it("disguises a share of the fighters from level 4, and none before", () => {
      expect(atLevel(3).disguise()).toBeNull();

      const level4 = atLevel(4);
      draws.push(ALLIED_SHARE - 0.01, 0);
      expect(level4.disguise()).not.toBeNull();
      draws.push(ALLIED_SHARE);
      expect(level4.disguise()).toBeNull();
    });

    it("shows its own colors for one frame each period, at its own moment, and all through TRUTH", () => {
      const level4 = atLevel(4);
      draws.push(0, 5 / ALLIED_TELL_PERIOD);
      const disguise = level4.disguise()!;

      const plain: number[] = [];
      for (let frame = 0; frame < 2 * ALLIED_TELL_PERIOD; frame++) {
        if (!disguise.shown()) plain.push(frame);
        level4.update(0);
      }
      expect(plain).toEqual([
        ALLIED_TELL_PERIOD - 5,
        2 * ALLIED_TELL_PERIOD - 5,
      ]);

      truth = 0.5;
      expect(disguise.shown()).toBe(false);
    });
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
