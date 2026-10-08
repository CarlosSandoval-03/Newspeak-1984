import type p5 from "p5";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Assets } from "../assets";
import { GAME_OVER_TEXT_DELAY, STAMP_DELAY } from "../config";
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

describe("GameOverScene", () => {
  const TEXT_AT = STAMP_DELAY + GAME_OVER_TEXT_DELAY;

  let keys: EventTarget;
  let manager: SceneManager;
  let scene: GameOverScene;
  let shown: string[];

  // Any p5 call is a no-op, except text, which records what was written.
  const p = new Proxy(
    {},
    {
      get: (_, key) =>
        key === "text"
          ? (text: string) => shown.push(text)
          : key === "textWidth"
            ? () => 100
            : () => {},
    },
  ) as p5;

  // One tick, as the manager runs it: update, then the input frame ends.
  const ticks = (n: number) => {
    for (let i = 0; i < n; i++) {
      scene.update();
      manager.input.endFrame();
    }
  };

  const drawn = () => {
    shown = [];
    scene.draw();
    return shown;
  };

  beforeEach(() => {
    resetGame();
    keys = new EventTarget();
    manager = new SceneManager(
      { image: {}, font: {} } as Assets,
      new Input(keys),
    );
    scene = new GameOverScene(p, manager);
    manager.change(scene);
  });

  it("stamps the photo, then names the pilot who never existed", () => {
    ticks(STAMP_DELAY - 1);
    expect(drawn()).toEqual([]);

    ticks(1);
    expect(drawn()).toEqual(["VAPORIZED"]);

    ticks(GAME_OVER_TEXT_DELAY);
    expect(drawn()).toEqual([
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
