import { beforeEach, describe, expect, it } from "vitest";
import { Input } from "./Input";

// Node has no KeyboardEvent; a plain Event with a code is all Input reads.
function key(type: "keydown" | "keyup", code: string): Event {
  return Object.assign(new Event(type, { cancelable: true }), { code });
}

describe("Input", () => {
  let target: EventTarget;
  let input: Input;

  beforeEach(() => {
    target = new EventTarget();
    input = new Input(target);
  });

  it("maps every bound key to its action", () => {
    target.dispatchEvent(key("keydown", "KeyZ"));
    expect(input.isDown("shoot")).toBe(true);
    expect(input.isDown("up")).toBe(false);
  });

  it("holds a key until its keyup", () => {
    target.dispatchEvent(key("keydown", "ArrowUp"));
    input.endFrame();
    expect(input.isDown("up")).toBe(true);
    target.dispatchEvent(key("keyup", "ArrowUp"));
    expect(input.isDown("up")).toBe(false);
  });

  it("reports a press only until the end of the frame", () => {
    target.dispatchEvent(key("keydown", "Enter"));
    expect(input.wasPressed("confirm")).toBe(true);
    input.endFrame();
    expect(input.wasPressed("confirm")).toBe(false);
  });

  it("ignores auto-repeat as a new press", () => {
    target.dispatchEvent(key("keydown", "Enter"));
    input.endFrame();
    target.dispatchEvent(key("keydown", "Enter"));
    expect(input.wasPressed("confirm")).toBe(false);
  });

  it("keeps a press released before the frame ends", () => {
    target.dispatchEvent(key("keydown", "Enter"));
    target.dispatchEvent(key("keyup", "Enter"));
    expect(input.wasPressed("confirm")).toBe(true);
  });

  it("blocks the browser default for game keys only", () => {
    const space = key("keydown", "Space");
    const tab = key("keydown", "Tab");
    target.dispatchEvent(space);
    target.dispatchEvent(tab);
    expect(space.defaultPrevented).toBe(true);
    expect(tab.defaultPrevented).toBe(false);
  });

  it("releases every key when the page loses focus", () => {
    target.dispatchEvent(key("keydown", "Space"));
    target.dispatchEvent(new Event("blur"));
    expect(input.isDown("shoot")).toBe(false);
  });
});
