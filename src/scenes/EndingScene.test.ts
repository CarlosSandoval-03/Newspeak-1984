import type p5 from "p5";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Assets } from "../assets";
import { Input } from "../core/Input";
import { SceneManager } from "../core/SceneManager";
import { LANGUAGES, setLanguage } from "../i18n";
import { resetGame, state } from "../state";
import { readHonorRoll } from "../systems/HonorRoll";
import { type Ending, EndingScene } from "./EndingScene";
import { MenuScene } from "./MenuScene";

describe("EndingScene", () => {
  let keys: EventTarget;
  let manager: SceneManager;
  let saved: Map<string, string>;

  const open = (ending: Ending = "obedient") => {
    const scene = new EndingScene({} as p5, manager, ending);
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

  it("enters the finished run on the honor roll under its pilot, with its total", () => {
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

  describe("the rebel ending", () => {
    // Every page's lines, read through to the end.
    const pages = (scene: EndingScene) =>
      scene["pages"].map(({ lines }) => lines.map(({ text }) => text));

    beforeEach(() => {
      Object.assign(state, { realScore: 52000, officialScore: 31000 });
      Object.assign(state.runStats, {
        kills: 120,
        officialKills: 90,
        eyesDestroyed: 4,
        policeDestroyed: 2,
        framesSeen: 1800,
        diaries: 3,
        pagesRead: [0, 2, 4],
      });
    });

    it("tells of the pilot who did not land, under the open sky", () => {
      const scene = open("rebel");

      expect(scene["current"].illustration).toBe("ending-rebel");
      expect(texts(scene)).toEqual(
        expect.arrayContaining([
          "The record, uncorrected",
          "Pilot 6079 did not land.",
        ]),
      );
    });

    it("sets the run beside the Ministry's record, and notes the officers it filed as enemies", () => {
      const record = pages(open("rebel"))[1];

      for (const row of [
        ["Score", "52000", "31000"],
        ["Aircraft destroyed", "120", "90"],
        ["Towers destroyed", "4", "0"],
        ["Thought Police downed", "2", "0"],
        ["Seconds observed", "30", "0"],
        ["Diary pages read", "3", "0"],
      ])
        expect(record.join("|")).toContain(row.join("|"));
      expect(record.join(" ")).toContain("as a Eurasian aircraft.");

      state.runStats.policeDestroyed = 0;
      expect(pages(open("rebel"))[1].join(" ")).not.toContain("Eurasian");
    });

    it("gives every diary page read a page of its own, on leather, in order", () => {
      const scene = open("rebel");
      const diaries = scene["pages"].slice(2);

      expect(diaries.map(({ leather }) => leather)).toEqual([true, true, true]);
      expect(pages(scene)[2].join(" ")).toContain(
        "If someone finds this, look at the dates.",
      );
    });

    it("goes back to the Menu after the last diary page", () => {
      const change = vi.spyOn(manager, "change");
      const scene = open("rebel");
      change.mockClear();

      for (let i = 0; i < 2 * scene["pages"].length - 1; i++) enter(scene);
      expect(change).not.toHaveBeenCalled();
      enter(scene);

      expect(change).toHaveBeenCalledWith(expect.any(MenuScene));
    });

    it("fits its labels before the numbers, and its pages on their leather, in every language", () => {
      // Courier Prime's advance is 0.6 of its size.
      const width = (text: string, size: number) => text.length * size * 0.6;

      for (const language of LANGUAGES) {
        setLanguage(language);
        const scene = open("rebel");
        const labels = scene["pages"][1].lines.filter(
          ({ x, y }) => x === 24 && y > 100,
        );
        for (const { text, size } of labels.slice(0, 7))
          expect(width(text, size)).toBeLessThan(296 - 24);

        for (const { lines } of scene["pages"].slice(2))
          expect(lines.at(-1)!.y).toBeLessThanOrEqual(24 + 568 - 8);
      }
    });
  });
});
