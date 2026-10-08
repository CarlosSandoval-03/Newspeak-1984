import type p5 from "p5";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Assets } from "../assets";
import {
  GAME_OVER_TEXT_DELAY,
  SIGNAL_OFF_FRAMES,
  STAMP_DELAY,
} from "../config";
import { Input } from "../core/Input";
import { SceneManager } from "../core/SceneManager";
import { resetGame, state } from "../state";
import { GameOverScene } from "./GameOverScene";
import { MenuScene } from "./MenuScene";

// Node has no KeyboardEvent; a plain Event with a code is all Input reads.
function press(target: EventTarget, code: string): void {
  target.dispatchEvent(Object.assign(new Event("keydown"), { code }));
  target.dispatchEvent(Object.assign(new Event("keyup"), { code }));
}

// Each image is stood in for by its own name.
const images = new Proxy({}, { get: (_, name) => name }) as Assets["image"];
const lastFrame = "last game frame" as unknown as p5.Image;

describe("GameOverScene", () => {
  const STAMP_AT = SIGNAL_OFF_FRAMES + STAMP_DELAY;
  const TEXT_AT = STAMP_AT + GAME_OVER_TEXT_DELAY;

  let keys: EventTarget;
  let manager: SceneManager;
  let scene: GameOverScene;
  let shown: string[];
  let pictures: unknown[];

  // Any p5 call is a no-op, except text and image, which record what was drawn.
  const p = new Proxy(
    { drawingContext: {} },
    {
      get: (target, key) => {
        if (key === "drawingContext") return target.drawingContext;
        if (key === "text") return (text: string) => shown.push(text);
        if (key === "image") return (image: unknown) => pictures.push(image);
        if (key === "textWidth") return () => 100;
        return () => {};
      },
    },
  ) as unknown as p5;

  // One tick, as the manager runs it: update, then the input frame ends.
  const ticks = (n: number) => {
    for (let i = 0; i < n; i++) {
      scene.update();
      manager.input.endFrame();
    }
  };

  const draw = () => {
    shown = [];
    pictures = [];
    scene.draw();
  };

  beforeEach(() => {
    resetGame();
    keys = new EventTarget();
    manager = new SceneManager(
      { image: images, font: {} } as Assets,
      new Input(keys),
    );
    scene = new GameOverScene(p, manager, lastFrame);
    manager.change(scene);
  });

  it("switches the game's last frame off before the photo appears", () => {
    draw();
    expect(pictures).toEqual([lastFrame]);

    ticks(SIGNAL_OFF_FRAMES - 1);
    draw();
    expect(pictures).toEqual([]);

    ticks(1);
    draw();
    expect(pictures).toEqual(["vaporized"]);
  });

  it("stamps the photo, then names the pilot who never existed", () => {
    ticks(STAMP_AT - 1);
    draw();
    expect(shown).toEqual([]);

    ticks(1);
    draw();
    expect(shown).toEqual(["VAPORIZED"]);

    ticks(GAME_OVER_TEXT_DELAY);
    draw();
    expect(shown).toEqual([
      "VAPORIZED",
      `PILOT ${state.pilotId} NEVER EXISTED.`,
      "PRESS ENTER",
    ]);
  });

  it("ignores Enter until it is offered", () => {
    const change = vi.spyOn(manager, "change");

    ticks(TEXT_AT - 1);
    press(keys, "Enter");
    ticks(1);

    expect(change).not.toHaveBeenCalled();
  });

  it("returns to the Menu on Enter, but not on Shoot", () => {
    const change = vi.spyOn(manager, "change");
    ticks(TEXT_AT);

    press(keys, "Space");
    ticks(1);
    expect(change).not.toHaveBeenCalled();

    press(keys, "Enter");
    ticks(1);
    expect(change).toHaveBeenCalledWith(expect.any(MenuScene));
  });
});
