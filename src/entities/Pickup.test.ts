import type p5 from "p5";
import { beforeEach, describe, expect, it } from "vitest";
import {
  CANVAS_HEIGHT,
  PAPER,
  PICKUP_RADIUS,
  PICKUP_SPEED,
  RED,
  STEEL,
} from "../config";
import { resetGame, state } from "../state";
import { Pickup } from "./Pickup";

describe("Pickup", () => {
  beforeEach(() => resetGame());

  // Records the color each text and rect is drawn in.
  const draw = (pickup: Pickup) => {
    const drawn: { kind: "text" | "rect"; color: unknown; text?: string }[] =
      [];
    let color: unknown;
    const p = {
      CENTER: "center",
      noStroke: () => {},
      textFont: () => {},
      textSize: () => {},
      textAlign: () => {},
      textWidth: (text: string) => text.length * 10,
      fill: (c: unknown) => (color = c),
      text: (text: string) => drawn.push({ kind: "text", color, text }),
      rect: () => drawn.push({ kind: "rect", color }),
    } as unknown as p5;

    pickup.draw(p);
    return drawn;
  };

  it("drifts down slower than the ground, and is gone past the bottom", () => {
    const pickup = new Pickup("FREE", { x: 100, y: 0 }, {} as p5.Font);

    pickup.update();
    expect(pickup.pos).toEqual({ x: 100, y: PICKUP_SPEED });

    pickup.pos.y = CANVAS_HEIGHT + PICKUP_RADIUS;
    pickup.update();
    expect(pickup.alive).toBe(false);
  });

  it("shows an available word in paper, with nothing struck", () => {
    const drawn = draw(new Pickup("ESCAPE", { x: 0, y: 0 }, {} as p5.Font));

    expect(drawn.at(-1)).toEqual({
      kind: "text",
      color: PAPER,
      text: "ESCAPE",
    });
    expect(drawn.some(({ color }) => color === RED)).toBe(false);
  });

  it("strikes a removed word out in red, the moment it is removed", () => {
    const pickup = new Pickup("FREE", { x: 0, y: 0 }, {} as p5.Font);
    state.words.delete("FREE");

    const drawn = draw(pickup);

    expect(drawn).toContainEqual({ kind: "text", color: STEEL, text: "FREE" });
    expect(drawn.at(-1)).toEqual({ kind: "rect", color: RED });
  });
});
