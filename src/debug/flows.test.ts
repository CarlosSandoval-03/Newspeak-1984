import type p5 from "p5";
import { beforeEach, describe, expect, it } from "vitest";
import type { Assets } from "../assets";
import { REBEL_DIARY_THRESHOLD, WORD_MAX_LEVEL } from "../config";
import { Input } from "../core/Input";
import { SceneManager } from "../core/SceneManager";
import { LEVELS } from "../levels/levels";
import { DictionaryScene } from "../scenes/DictionaryScene";
import { EndingScene, earnedEnding } from "../scenes/EndingScene";
import { GameScene } from "../scenes/GameScene";
import { MinistryScene } from "../scenes/MinistryScene";
import { resetGame, state } from "../state";
import { VERDICT } from "../types";
import { chooseEnding, parseFlow, startFlow, unlockWords } from "./flows";

const images = new Proxy({}, { get: (_, name) => name }) as Assets["image"];
const platform: Assets["platform"] = {
  sprite: "launch-platform.png",
  park: { x: 56, y: 128 },
  liftoff: { x: 56, y: 24 },
  touchdown: { x: 56, y: 232 },
  lamps: [],
};
const p = { get: () => ({}) } as unknown as p5;

describe("parseFlow", () => {
  it("reads a kind and its argument", () => {
    expect(parseFlow("level:3")).toEqual({ kind: "level", level: 3 });
    expect(parseFlow("boss")).toEqual({ kind: "boss", level: 1 });
    expect(parseFlow("ministry:suspect")).toEqual({
      kind: "ministry",
      verdict: VERDICT.suspect,
    });
    expect(parseFlow("ending:rebel")).toEqual({
      kind: "ending",
      ending: "rebel",
    });
    expect(parseFlow("departure")).toEqual({ kind: "departure" });
    expect(parseFlow("enlistment")).toEqual({ kind: "enlistment" });
  });

  it("knows nothing it can't open", () => {
    for (const start of [
      null,
      "",
      "level:0",
      `level:${LEVELS.length + 1}`,
      "level:two",
      "ministry:traitor",
      "ending:happy",
      "credits",
    ])
      expect(parseFlow(start)).toBeNull();
  });
});

describe("startFlow", () => {
  let manager: SceneManager;
  const scene = () => manager["scene"];

  beforeEach(() => {
    manager = new SceneManager(
      { image: images, font: {}, platform } as Assets,
      new Input(new EventTarget()),
    );
  });

  it("opens a level's Dictionary, or the level itself already in the air", () => {
    startFlow(p, manager, { kind: "dictionary", level: 2 }, 0);
    expect(scene()).toBeInstanceOf(DictionaryScene);
    expect(state.level).toBe(2);

    startFlow(p, manager, { kind: "level", level: 3 }, 0);
    const game = scene() as GameScene;
    expect(state.level).toBe(3);
    expect(game["flight"].flying).toBe(true);
    expect(game["player"].altitude).toBe(1);
  });

  it("flies to where the city stops for the boss", () => {
    startFlow(p, manager, { kind: "boss", level: 2 }, 0);

    expect((scene() as GameScene)["flight"].scroll).toBe(LEVELS[1].length);
  });

  it("starts the landing at once, or the rebel's departure after the Eye", () => {
    startFlow(p, manager, { kind: "landing", level: 1 }, 0);
    (scene() as GameScene).update();
    expect((scene() as GameScene)["flight"].landing).toBe(true);

    startFlow(p, manager, { kind: "departure" }, 0);
    const last = scene() as GameScene;
    last.update();
    expect(state.level).toBe(LEVELS.length);
    expect(state.runStats.diaries).toBeGreaterThanOrEqual(
      REBEL_DIARY_THRESHOLD,
    );
    expect(last["flight"]["phase"]).toBe("departing");
  });

  it("has the Ministry judge a level to the verdict asked for", () => {
    for (const verdict of Object.values(VERDICT)) {
      startFlow(p, manager, { kind: "ministry", verdict }, 0);
      expect(scene()).toBeInstanceOf(MinistryScene);
      expect((scene() as MinistryScene)["report"].verdict).toBe(verdict);
    }
  });

  it("opens either ending, the rebel's with enough of the diary read", () => {
    startFlow(p, manager, { kind: "ending", ending: "rebel" }, 0);

    expect(scene()).toBeInstanceOf(EndingScene);
    expect(state.runStats.pagesRead).toEqual([0, 1, 2]);
  });

  it("reads as many diary pages as asked, one per level at most", () => {
    startFlow(p, manager, { kind: "level", level: 1 }, 2);
    expect(state.runStats.pagesRead).toEqual([0, 1]);

    startFlow(p, manager, { kind: "level", level: 1 }, 99);
    expect(state.runStats.diaries).toBe(LEVELS.length);
  });
});

describe("unlockWords", () => {
  beforeEach(() => {
    resetGame();
    state.words.delete("FREE");
    state.words.delete("ESCAPE");
  });

  it("gives every word back, even the ones taken, at the level asked for, with the bombs", () => {
    unlockWords(2);

    expect([...state.words].sort()).toEqual([
      "ESCAPE",
      "FREE",
      "REMEMBER",
      "TRUTH",
    ]);
    expect(state.wordLevels).toEqual({
      FREE: 2,
      ESCAPE: 2,
      REMEMBER: 2,
      TRUTH: 2,
    });
    expect(state.bombs).toBe(2);
  });

  it("keeps the level between asleep and the top", () => {
    unlockWords(9);
    expect(state.wordLevels.FREE).toBe(WORD_MAX_LEVEL);

    unlockWords(-1);
    expect(state.wordLevels.FREE).toBe(0);
  });
});

describe("chooseEnding", () => {
  beforeEach(() => {
    resetGame();
  });

  it("reads just enough of the diary for the rebel, and keeps more already read", () => {
    chooseEnding("rebel");
    expect(state.runStats.pagesRead).toEqual([0, 1, 2]);
    expect(earnedEnding()).toBe("rebel");

    state.runStats.diaries = 4;
    chooseEnding("rebel");
    expect(state.runStats.diaries).toBe(4);
  });

  it("leaves the obedient pilot one page short", () => {
    state.runStats.diaries = LEVELS.length;
    chooseEnding("obedient");

    expect(state.runStats.diaries).toBe(REBEL_DIARY_THRESHOLD - 1);
    expect(state.runStats.pagesRead).toHaveLength(REBEL_DIARY_THRESHOLD - 1);
    expect(earnedEnding()).toBe("obedient");
  });
});
