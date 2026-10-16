import type p5 from "p5";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Assets } from "../assets";
import { CANVAS_WIDTH } from "../config";
import { Input } from "../core/Input";
import { SceneManager } from "../core/SceneManager";
import { LANGUAGES, setLanguage } from "../i18n";
import { resetGame, state } from "../state";
import { DictionaryScene } from "./DictionaryScene";
import { EnlistmentScene } from "./EnlistmentScene";

describe("EnlistmentScene", () => {
  let keys: EventTarget;
  let manager: SceneManager;

  const open = () => {
    const scene = new EnlistmentScene({} as p5, manager);
    manager.change(scene);
    return scene;
  };
  const texts = (scene: EnlistmentScene) =>
    scene["lines"].map(({ text }) => text);
  const enter = (scene: EnlistmentScene) => {
    keys.dispatchEvent(Object.assign(new Event("keydown"), { code: "Enter" }));
    keys.dispatchEvent(Object.assign(new Event("keyup"), { code: "Enter" }));
    scene.update();
    manager.input.endFrame();
  };

  beforeEach(() => {
    resetGame();
    state.pilotId = "6079";
    vi.stubGlobal("document", { documentElement: {} });
    keys = new EventTarget();
    manager = new SceneManager(
      { image: {}, font: {} } as Assets,
      new Input(keys),
    );
  });

  afterEach(() => {
    setLanguage("en");
    vi.unstubAllGlobals();
  });

  it("files the pilot under the number drawn for the run, with no name", () => {
    const lines = texts(open());

    expect(lines).toEqual(
      expect.arrayContaining(["PILOT", "6079", "NAME: NOT REQUIRED"]),
    );
    expect(lines.join(" ")).toContain("Pilot 6079. From today your number");
  });

  it("finishes the page on the first Enter, and opens the first Dictionary on the next", () => {
    const scene = open();
    const change = vi.spyOn(manager, "change");

    enter(scene);
    expect(scene["typewriter"].done).toBe(true);
    expect(change).not.toHaveBeenCalled();

    enter(scene);
    expect(change).toHaveBeenCalledWith(expect.any(DictionaryScene));
  });

  it("fits every line on the page, beside the portrait or under it, in every language", () => {
    // Courier Prime's advance is 0.6 of its size.
    for (const language of LANGUAGES) {
      setLanguage(language);
      for (const { text, x, size } of open()["lines"])
        expect(x + text.length * size * 0.6).toBeLessThanOrEqual(
          CANVAS_WIDTH - 24,
        );
    }
  });
});
