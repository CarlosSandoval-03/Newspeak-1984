import type p5 from "p5";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Assets } from "../assets";
import { Input } from "../core/Input";
import { SceneManager } from "../core/SceneManager";
import { LANGUAGES, setLanguage } from "../i18n";
import { resetGame, state } from "../state";
import { readHonorRoll } from "../systems/HonorRoll";
import { EndingScene } from "./EndingScene";
import { MenuScene } from "./MenuScene";

describe("EndingScene", () => {
  let keys: EventTarget;
  let manager: SceneManager;
  let saved: Map<string, string>;

  const open = () => {
    const scene = new EndingScene({} as p5, manager);
    manager.change(scene);
    return scene;
  };
  const texts = (scene: EndingScene) =>
    scene["current"].lines.map(({ text }) => text);
  const enter = (scene: EndingScene) => {
    keys.dispatchEvent(Object.assign(new Event("keydown"), { code: "Enter" }));
    keys.dispatchEvent(Object.assign(new Event("keyup"), { code: "Enter" }));
    scene.update();
    manager.input.endFrame();
  };

  beforeEach(() => {
    resetGame();
    state.pilotId = "6079";
    state.officialScore = 31000;
    saved = new Map();
    vi.stubGlobal("document", { documentElement: {} });
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => saved.get(key) ?? null,
      setItem: (key: string, value: string) => saved.set(key, value),
    });
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

  it("enters the finished run on the honor roll", () => {
    const scene = open();

    expect(readHonorRoll()).toEqual([
      { pilotId: "6079", score: 31000, unperson: false },
    ]);
    expect(scene["honorRoll"]).toEqual(readHonorRoll());
  });

  it("tells the grateful citizen's story with the run's official score", () => {
    const page = texts(open());

    expect(page[0]).toBe("A GRATEFUL CITIZEN");
    expect(page.join(" ")).toContain(
      "Pilot 6079 has been reassigned to a quiet desk.",
    );
    expect(page.slice(-2)).toEqual(["OFFICIAL SCORE", "031000"]);
  });

  it("finishes the story, turns to the honor roll, then goes back to the Menu", () => {
    const change = vi.spyOn(manager, "change");
    const scene = open();
    change.mockClear();

    enter(scene);
    expect(scene["typing"].done).toBe(true);
    expect(scene["current"].honorRoll).toBe(false);

    enter(scene);
    expect(scene["current"].honorRoll).toBe(true);
    expect(change).not.toHaveBeenCalled();

    enter(scene);
    expect(change).toHaveBeenCalledWith(expect.any(MenuScene));
  });

  it("fits the story above the score, in every language", () => {
    for (const language of LANGUAGES) {
      setLanguage(language);
      const { lines } = open()["current"];
      const story = lines.slice(0, -2);
      const [score] = lines.slice(-2);

      expect(story.at(-1)!.y).toBeLessThanOrEqual(score.y - score.size);
    }
  });
});
