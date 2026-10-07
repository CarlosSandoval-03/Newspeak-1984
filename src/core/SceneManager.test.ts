import { describe, expect, it, vi } from "vitest";
import type { Assets } from "../assets";
import { MAX_UPDATES_PER_FRAME, TICK_MS } from "../config";
import { Input } from "./Input";
import type { Scene } from "./Scene";
import { SceneManager } from "./SceneManager";

function setup() {
  const input = new Input(new EventTarget());
  const manager = new SceneManager({} as Assets, input);

  const calls: string[] = [];
  const scene = (name: string): Scene => ({
    enter: () => calls.push(`${name}.enter`),
    update: () => calls.push(`${name}.update`),
    draw: () => calls.push(`${name}.draw`),
    exit: () => calls.push(`${name}.exit`),
  });

  vi.spyOn(input, "endFrame").mockImplementation(() => calls.push("endFrame"));

  return { manager, calls, scene };
}

const count = (calls: string[], call: string) =>
  calls.filter((c) => c === call).length;

describe("SceneManager", () => {
  it("exits the current scene before entering the next", () => {
    const { manager, calls, scene } = setup();
    manager.change(scene("a"));
    manager.change(scene("b"));

    expect(calls).toEqual(["a.enter", "a.exit", "b.enter"]);
  });

  it("ends the input frame after every update, then draws once", () => {
    const { manager, calls, scene } = setup();
    manager.change(scene("a"));
    calls.length = 0;

    manager.frame(TICK_MS * 2);
    expect(calls).toEqual([
      "a.update",
      "endFrame",
      "a.update",
      "endFrame",
      "a.draw",
    ]);
  });

  it("carries a partial tick over to the next frame", () => {
    const { manager, calls, scene } = setup();
    manager.change(scene("a"));

    manager.frame(TICK_MS * 0.6);
    expect(count(calls, "a.update")).toBe(0);
    expect(count(calls, "a.draw")).toBe(1);

    manager.frame(TICK_MS * 0.6);
    expect(count(calls, "a.update")).toBe(1);
  });

  it("runs at most the capped updates and drops the ticks still owed", () => {
    const { manager, calls, scene } = setup();
    manager.change(scene("a"));

    manager.frame(TICK_MS * 10);
    expect(count(calls, "a.update")).toBe(MAX_UPDATES_PER_FRAME);

    manager.frame(TICK_MS * 0.5);
    expect(count(calls, "a.update")).toBe(MAX_UPDATES_PER_FRAME);
  });

  it("keeps real time on a screen slower than 60 Hz", () => {
    const { manager, calls, scene } = setup();
    manager.change(scene("a"));

    for (let i = 0; i < 35; i++) manager.frame(1000 / 35);
    expect(count(calls, "a.update")).toBe(60);
  });

  it("updates the scene a change switched to mid-frame", () => {
    const { manager, calls, scene } = setup();
    const b = scene("b");
    manager.change({ ...scene("a"), update: () => manager.change(b) });
    calls.length = 0;

    manager.frame(TICK_MS * 2);
    expect(calls).toEqual([
      "a.exit",
      "b.enter",
      "endFrame",
      "b.update",
      "endFrame",
      "b.draw",
    ]);
  });
});
