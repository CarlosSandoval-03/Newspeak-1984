import type p5 from "p5";
import { describe, expect, it, vi } from "vitest";
import type { Propaganda } from "../systems/Propaganda";
import { HUD } from "./HUD";
import source from "./HUD.ts?raw";

describe("HUD", () => {
  it("never reads the game state", () => {
    expect(source).not.toMatch(/\bstate\b/);
  });

  it("shows the zero-padded score and the lives Propaganda reports", () => {
    const text = vi.fn();
    const p = {
      LEFT: "left",
      RIGHT: "right",
      BASELINE: "alphabetic",
      noStroke: () => {},
      textFont: () => {},
      textSize: () => {},
      textAlign: () => {},
      fill: () => {},
      text,
    } as unknown as p5;
    const propaganda = {
      displayedScore: () => 4210,
      displayedLives: () => 3,
    } as Propaganda;

    new HUD(p, {} as p5.Font, propaganda).draw();

    const shown = text.mock.calls.map((call) => call[0]);
    expect(shown).toContain("SCORE 004210");
    expect(shown).toContain("LIVES 3");
  });
});
