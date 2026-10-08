import type p5 from "p5";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Assets } from "../assets";
import { Input } from "../core/Input";
import { SceneManager } from "../core/SceneManager";
import { currentLanguage, setLanguage } from "../i18n";
import { state } from "../state";
import { GameScene } from "./GameScene";
import { MenuScene } from "./MenuScene";

// Node has no KeyboardEvent; a plain Event with a code is all Input reads.
function press(target: EventTarget, code: string): void {
  target.dispatchEvent(Object.assign(new Event("keydown"), { code }));
  target.dispatchEvent(Object.assign(new Event("keyup"), { code }));
}

describe("MenuScene", () => {
  let keys: EventTarget;
  let manager: SceneManager;
  let menu: MenuScene;

  // One tick, as the manager runs it: update, then the input frame ends.
  const tick = () => {
    menu.update();
    manager.input.endFrame();
  };

  beforeEach(() => {
    vi.stubGlobal("document", { documentElement: { lang: "" } });
    vi.stubGlobal("localStorage", { setItem: () => {} });

    keys = new EventTarget();
    manager = new SceneManager({} as Assets, new Input(keys));
    menu = new MenuScene({} as p5, manager);
    manager.change(menu);
  });

  afterEach(() => {
    setLanguage("en");
    vi.unstubAllGlobals();
  });

  it("starts a new run on BEGIN SERVICE", () => {
    const change = vi.spyOn(manager, "change");
    state.realScore = 500;

    press(keys, "Enter");
    tick();

    expect(state.realScore).toBe(0);
    expect(change).toHaveBeenCalledWith(expect.any(GameScene));
  });

  it("accepts Shoot as confirm", () => {
    const change = vi.spyOn(manager, "change");

    press(keys, "Space");
    tick();

    expect(change).toHaveBeenCalledOnce();
  });

  it("switches the language with Enter, Left, and Right", () => {
    press(keys, "ArrowDown");
    tick();

    press(keys, "Enter");
    tick();
    expect(currentLanguage()).toBe("es");

    press(keys, "ArrowLeft");
    tick();
    expect(currentLanguage()).toBe("en");

    press(keys, "ArrowRight");
    tick();
    expect(currentLanguage()).toBe("es");
  });

  it("ignores Left and Right on BEGIN SERVICE", () => {
    press(keys, "ArrowRight");
    tick();

    expect(currentLanguage()).toBe("en");
  });

  it("keeps the selection inside the list", () => {
    const change = vi.spyOn(manager, "change");

    press(keys, "ArrowUp");
    tick();
    press(keys, "Enter");
    tick();

    expect(change).toHaveBeenCalledOnce();
  });

  it("selects BEGIN SERVICE again on every visit", () => {
    press(keys, "ArrowDown");
    tick();

    menu.enter();
    press(keys, "Enter");
    tick();

    expect(currentLanguage()).toBe("en");
  });
});
