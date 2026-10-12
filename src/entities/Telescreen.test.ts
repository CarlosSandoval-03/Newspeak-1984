import type p5 from "p5";
import { describe, expect, it } from "vitest";
import {
  CANVAS_HEIGHT,
  INK,
  TELESCREEN_SHOW_FRAMES,
  TELESCREEN_SIZE,
  TELESCREEN_STATIC_FRAMES,
} from "../config";
import { Telescreen, type TelescreenShow } from "./Telescreen";

const font = "VT323" as unknown as p5.Font;

// Records the text and the pupil-colored rows of one frame.
function drawn(screen: Telescreen) {
  const frame = { texts: [] as string[], inkRows: [] as number[] };
  const context = {
    fillStyle: null as unknown,
    fillRect: (x: number, _y: number, w: number) => {
      if (context.fillStyle === INK) frame.inkRows.push(x + w / 2);
    },
  };
  const p = {
    CORNER: "corner",
    CENTER: "center",
    drawingContext: context,
    noStroke: () => {},
    rectMode: () => {},
    fill: () => {},
    rect: () => {},
    textFont: () => {},
    textSize: () => {},
    textAlign: () => {},
    text: (text: string) => frame.texts.push(text),
  } as unknown as p5;

  screen.draw(p);
  return frame;
}

const watching = (target = { x: 0, y: 0 }) =>
  new Telescreen(
    { x: 200, y: 300 },
    "THE LEADER\nIS WATCHING",
    font,
    () => target,
  );

describe("Telescreen", () => {
  it("switches on to static, then shows the eye and its slogan in turn, each through static", () => {
    const screen = watching();
    const shows: TelescreenShow[] = [];
    const turn = TELESCREEN_STATIC_FRAMES + TELESCREEN_SHOW_FRAMES;

    for (let frame = 0; frame < turn * 3; frame++) {
      if (shows.at(-1) !== screen.showing) shows.push(screen.showing);
      screen.update();
    }

    expect(shows).toEqual(["static", "eye", "static", "line", "static", "eye"]);
  });

  it("types its slogan's lines while it shows them", () => {
    const screen = watching();
    while (screen.showing !== "line") screen.update();

    expect(drawn(screen).texts).toEqual(["THE LEADER", "IS WATCHING"]);
  });

  it("turns the eye's pupil toward the plane", () => {
    const toward = (x: number) => {
      const screen = watching({ x, y: 300 });
      while (screen.showing !== "eye") screen.update();
      const rows = drawn(screen).inkRows;
      return rows.reduce((sum, row) => sum + row, 0) / rows.length;
    };

    expect(toward(0)).toBeLessThan(200);
    expect(toward(480)).toBeGreaterThan(200);
  });

  it("is gone once it has scrolled off the bottom", () => {
    const screen = new Telescreen(
      { x: 200, y: CANVAS_HEIGHT },
      "OBEY",
      font,
      () => ({ x: 0, y: 0 }),
    );
    screen.vel = { x: 0, y: TELESCREEN_SIZE.h / 2 + 1 };
    screen.update();

    expect(screen.alive).toBe(false);
  });
});
