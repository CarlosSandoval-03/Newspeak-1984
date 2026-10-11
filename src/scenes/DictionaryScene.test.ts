import type p5 from "p5";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Assets } from "../assets";
import { STRIKE_FRAMES } from "../config";
import { Input } from "../core/Input";
import { SceneManager } from "../core/SceneManager";
import { resetGame, state } from "../state";
import { DictionaryScene } from "./DictionaryScene";
import { GameScene } from "./GameScene";

describe("DictionaryScene", () => {
  let keys: EventTarget;
  let manager: SceneManager;

  // Brackets reach the page the scene built, as the other scene tests do.
  const open = (level: number) => {
    state.level = level;
    const scene = new DictionaryScene({} as p5, manager);
    manager.change(scene);
    return scene;
  };
  const texts = (scene: DictionaryScene) =>
    scene["lines"].map(({ text }) => text);
  const struck = (scene: DictionaryScene, how: "earlier" | "now") =>
    scene["lines"]
      .filter(({ strike }) => strike === how)
      .map(({ text }) => text);
  const tick = (scene: DictionaryScene) => {
    scene.update();
    manager.input.endFrame();
  };
  const enter = (scene: DictionaryScene) => {
    keys.dispatchEvent(Object.assign(new Event("keydown"), { code: "Enter" }));
    keys.dispatchEvent(Object.assign(new Event("keyup"), { code: "Enter" }));
    tick(scene);
  };

  beforeEach(() => {
    resetGame();
    state.pilotId = "0042";
    keys = new EventTarget();
    manager = new SceneManager(
      { image: {}, font: {} } as Assets,
      new Input(keys),
    );
  });

  it("opens level 1's edition complete, with the calm briefing", () => {
    const scene = open(1);

    expect(texts(scene)).toEqual(
      expect.arrayContaining([
        "ELEVENTH EDITION",
        "FREE",
        "ESCAPE",
        "REMEMBER",
        "TRUTH",
        "THIS EDITION IS COMPLETE.",
      ]),
    );
    expect(texts(scene).join(" ")).toContain(
      "Pilot 0042. Eurasian bombers approach the capital.",
    );
    expect(struck(scene, "now")).toEqual([]);
  });

  it("strikes this level's word, with the earlier ones already struck", () => {
    const scene = open(3);

    // Too long for the column beside the cover, so it breaks onto two lines.
    expect(texts(scene).join(" ")).toContain("THIRTEENTH EDITION");
    expect(struck(scene, "earlier")).toEqual(["FREE"]);
    expect(struck(scene, "now")).toEqual(["ESCAPE"]);
    expect(texts(scene)).toContain("THE WORD ESCAPE IS NO LONGER REQUIRED.");
    expect(texts(scene).join(" ")).toContain("Pilot 0042.");
  });

  it("strikes the word only once it is typed, over a few frames", () => {
    const scene = open(2);
    const now = scene["lines"].findIndex(({ strike }) => strike === "now");

    while (!scene["typewriter"].typedLine(now)) {
      expect(scene["strikeAge"]).toBe(0);
      tick(scene);
    }
    for (let i = 1; i < STRIKE_FRAMES; i++) tick(scene);
    expect(scene["strikeAge"]).toBe(STRIKE_FRAMES);
  });

  it("finishes the page on the first Enter and takes off on the next", () => {
    const change = vi.spyOn(manager, "change");
    const scene = open(2);
    tick(scene);

    enter(scene);
    expect(scene["typewriter"].done).toBe(true);
    expect(scene["strikeAge"]).toBe(STRIKE_FRAMES);
    expect(change).toHaveBeenCalledTimes(1);

    enter(scene);
    expect(change).toHaveBeenLastCalledWith(expect.any(GameScene));
  });

  it("takes off at the first Enter once the page has settled by itself", () => {
    const change = vi.spyOn(manager, "change");
    const scene = open(1);
    while (!scene["typewriter"].done) tick(scene);

    enter(scene);

    expect(change).toHaveBeenLastCalledWith(expect.any(GameScene));
  });
});
