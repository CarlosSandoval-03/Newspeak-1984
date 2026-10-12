import type p5 from "p5";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Assets } from "../assets";
import { SLIDE_FRAMES, STAMP_DELAY, STRIKE_FRAMES, TICK_MS } from "../config";
import { Input } from "../core/Input";
import { SceneManager } from "../core/SceneManager";
import { LANGUAGES, setLanguage } from "../i18n";
import { LEVELS } from "../levels/levels";
import { resetGame, state } from "../state";
import { readHonorRoll } from "../systems/HonorRoll";
import type { Report } from "../systems/Ministry";
import { type Stats, VERDICT } from "../types";
import { DictionaryScene } from "./DictionaryScene";
import { MenuScene } from "./MenuScene";
import { MinistryScene } from "./MinistryScene";

// The top of the prompt's 20 px line, whose baseline is at 632.
const PROMPT_TOP = 612;

const flown = (stats: Partial<Stats>): Stats => ({
  kills: 0,
  eyesDestroyed: 0,
  policeDestroyed: 0,
  framesSeen: 0,
  diaries: 0,
  ...stats,
});

describe("MinistryScene", () => {
  let keys: EventTarget;
  let manager: SceneManager;

  const open = (report: Partial<Report> = {}) => {
    const scene = new MinistryScene({} as p5, manager, {
      stats: flown({}),
      realScore: 4210,
      officialScore: 5978,
      officialKills: 0,
      verdict: VERDICT.underReview,
      ...report,
    });
    manager.change(scene);
    return scene;
  };
  const texts = (scene: MinistryScene) =>
    [...scene["record"], ...scene["correction"]].map(({ text }) => text);
  const tick = (scene: MinistryScene) => {
    scene.update();
    manager.input.endFrame();
  };
  const enter = (scene: MinistryScene) => {
    keys.dispatchEvent(Object.assign(new Event("keydown"), { code: "Enter" }));
    keys.dispatchEvent(Object.assign(new Event("keyup"), { code: "Enter" }));
    tick(scene);
  };

  beforeEach(() => {
    resetGame();
    keys = new EventTarget();
    manager = new SceneManager(
      { image: {}, font: {} } as Assets,
      new Input(keys),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("files the real score and the official one, six digits each", () => {
    const scene = open();

    expect(scene["record"].at(-1)?.text).toBe("004210");
    expect(texts(scene)).toEqual(
      expect.arrayContaining([
        "MINISTRY OF TRUTH",
        "RECORDS DEPARTMENT",
        "SCORE AS REPORTED",
        "OFFICIAL SCORE",
        "005978",
        "CORRECTIONS",
      ]),
    );
  });

  it("corrects only the stats that aren't zero, the kills by the verdict", () => {
    const quiet = open();
    expect(texts(quiet).at(-1)).toBe("CORRECTIONS");

    const scene = open({
      stats: flown({ kills: 42, framesSeen: 300, diaries: 1 }),
      officialKills: 21,
    });
    const page = texts(scene).join(" ");

    expect(page).toContain("destroyed: 42, corrected to 21.");
    expect(page).toContain(
      `observation: ${Math.round((300 * TICK_MS) / 1000)} s, corrected to 0.`,
    );
    expect(page).toContain("Diaries recovered: 1, corrected to 0.");
    expect(page).not.toContain("towers");
    expect(page).not.toContain("Thought Police");
  });

  it("counts the downed police among the enemy aircraft, right above denying they were lost", () => {
    const scene = open({
      stats: flown({ kills: 41, policeDestroyed: 1 }),
      officialKills: 21,
    });
    const page = texts(scene).join(" ");

    expect(page).toContain("destroyed: 42, corrected to 21.");
    expect(page).toContain("Thought Police officers lost: 1, corrected to 0.");
    expect(page.indexOf("destroyed: 42")).toBeLessThan(
      page.indexOf("Thought Police"),
    );
  });

  it("types the record and strikes its score, types the correction, then drops the score, notes it never existed, and stamps", () => {
    const scene = open();

    while (!scene["recordTyping"].done) tick(scene);
    expect(scene["strikeAge"]).toBe(0);

    for (let i = 0; i < STRIKE_FRAMES; i++) {
      expect(scene["correctionTyping"].shown(0)).toBe("");
      tick(scene);
    }

    while (!scene["correctionTyping"].done) tick(scene);
    expect(scene["slideAge"]).toBe(0);

    for (let i = 0; i < SLIDE_FRAMES; i++) tick(scene);
    expect(scene["erasureTyping"].shown(0)).toBe("");

    while (!scene["erasureTyping"].done) tick(scene);
    expect(scene["erasure"][0].text).toBe("NEVER EXISTED");
    expect(scene["settled"]).toBe(false);
    for (let i = 0; i < STAMP_DELAY; i++) tick(scene);
    expect(scene["settled"]).toBe(true);
  });

  it("settles each page before turning it: the record, then the honor roll, then the next Dictionary", () => {
    const change = vi.spyOn(manager, "change");
    const scene = open();
    change.mockClear();

    enter(scene);
    expect(scene["settled"]).toBe(true);
    enter(scene);
    expect(scene["page"]).toBe("honorRoll");
    expect(scene["honorRoll"].done).toBe(false);
    enter(scene);
    expect(scene["honorRoll"].done).toBe(true);
    expect(change).not.toHaveBeenCalled();

    enter(scene);
    expect(state.level).toBe(2);
    expect(change).toHaveBeenCalledWith(expect.any(DictionaryScene));
  });

  it("goes back to the Menu after the last level, entering the run on the honor roll", () => {
    const saved = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => saved.get(key) ?? null,
      setItem: (key: string, value: string) => saved.set(key, value),
    });
    const change = vi.spyOn(manager, "change");
    state.level = LEVELS.length;
    state.pilotId = "6079";
    state.officialScore = 31000;
    const scene = open();

    for (let i = 0; i < 3; i++) enter(scene);
    expect(readHonorRoll()).toEqual([]);
    enter(scene);

    expect(readHonorRoll()).toEqual([
      { pilotId: "6079", score: 31000, unperson: false },
    ]);
    expect(change).toHaveBeenLastCalledWith(expect.any(MenuScene));
  });

  it("tampers with the honor roll at every visit", () => {
    vi.stubGlobal("localStorage", {
      getItem: () =>
        JSON.stringify([{ pilotId: "0042", score: 900, unperson: false }]),
      setItem: (_: string, value: string) => (stored = value),
    });
    let stored = "";
    // Every draw erases.
    vi.spyOn(Math, "random").mockReturnValue(0);

    open();

    expect(JSON.parse(stored)).toEqual([
      { pilotId: "0042", score: 0, unperson: true },
    ]);
  });

  it("stamps a hero's file approved, and any other corrected", () => {
    const stamped = (verdict: Report["verdict"]) =>
      open({ verdict })["stampKey"];

    expect(stamped(VERDICT.hero)).toBe("ministry.stamps.approved");
    expect(stamped(VERDICT.underReview)).toBe("ministry.stamps.corrected");
    expect(stamped(VERDICT.suspect)).toBe("ministry.stamps.corrected");
  });

  it("fits every correction above the prompt, in every language", () => {
    vi.stubGlobal("document", { documentElement: {} });
    vi.stubGlobal("localStorage", { setItem: () => {} });

    for (const language of LANGUAGES) {
      setLanguage(language);
      for (const verdict of Object.values(VERDICT)) {
        const scene = open({
          stats: flown({
            kills: 999,
            eyesDestroyed: 99,
            policeDestroyed: 9,
            framesSeen: 99 * 60,
            diaries: 9,
          }),
          officialKills: 999,
          verdict,
        });

        expect(scene["correction"].at(-1)?.y).toBeLessThanOrEqual(PROMPT_TOP);
      }
    }
    setLanguage("en");
  });
});
