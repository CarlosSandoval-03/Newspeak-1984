import type p5 from "p5";
import { describe, expect, it, vi } from "vitest";
import { RED } from "../config";
import type { Propaganda } from "../systems/Propaganda";
import { ALERT } from "../types";
import { HUD } from "./HUD";
import source from "./HUD.ts?raw";

describe("HUD", () => {
  it("never reads the game state", () => {
    expect(source).not.toMatch(/\bstate\b/);
  });

  const draw = (
    shown: Partial<Propaganda>,
    bossHealth: number | null = null,
  ) => {
    const text = vi.fn();
    const rects: { color: unknown; w: number }[] = [];
    let color: unknown;
    const p = {
      LEFT: "left",
      RIGHT: "right",
      BASELINE: "alphabetic",
      noStroke: () => {},
      textFont: () => {},
      textSize: () => {},
      textAlign: () => {},
      fill: (c: unknown) => (color = c),
      rect: (_x: number, _y: number, w: number) => rects.push({ color, w }),
      text,
    } as unknown as p5;
    const propaganda = {
      displayedScore: () => 4210,
      displayedLives: () => 3,
      displayedSuspicion: () => 0,
      displayedAlert: () => ALERT.normal,
      ...shown,
    } as Propaganda;

    new HUD(p, {} as p5.Font, propaganda).draw(bossHealth);
    return { shown: text.mock.calls.map((call) => call[0]), rects };
  };

  it("shows the zero-padded score and the lives Propaganda reports", () => {
    const { shown } = draw({});

    expect(shown).toContain("SCORE 004210");
    expect(shown).toContain("LIVES 3");
  });

  it("shows the suspicion and the alert state Propaganda reports", () => {
    const { shown } = draw({ displayedAlert: () => ALERT.thoughtPolice });

    expect(shown).toContain("SUSPICION");
    expect(shown).toContain("THOUGHT POLICE");
  });

  it("fills the meter in red in proportion to the suspicion", () => {
    const red = (suspicion: number) =>
      draw({ displayedSuspicion: () => suspicion }).rects.find(
        (rect) => rect.color === RED,
      )?.w;

    expect(red(0)).toBe(0);
    expect(red(50)).toBe(59);
    expect(red(100)).toBe(118);
  });

  it("shows a red boss bar only while a boss is on screen", () => {
    const reds = (bossHealth: number | null) =>
      draw({}, bossHealth)
        .rects.filter((rect) => rect.color === RED)
        .map((rect) => rect.w);

    // The meter's empty red fill is always there; the bar comes on top of it.
    expect(reds(null)).toEqual([0]);
    expect(reds(1)).toEqual([0, 464]);
    expect(reds(0.5)).toEqual([0, 232]);
  });
});
