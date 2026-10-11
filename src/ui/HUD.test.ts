import type p5 from "p5";
import { describe, expect, it, vi } from "vitest";
import { CONCRETE, INK, LEATHER, PAPER, RED, STEEL } from "../config";
import type { Propaganda, WordView } from "../systems/Propaganda";
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
    const rects: { color: unknown; x: number; y: number; w: number }[] = [];
    const inked: { text: string; color: unknown; x?: unknown }[] = [];
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
      rect: (x: number, y: number, w: number) => rects.push({ color, x, y, w }),
      text: (s: string, x: number, ...rest: unknown[]) => {
        inked.push({ text: s, color });
        if (s === "FREE" || s === "TRUTH") inked.at(-1)!.x = x;
        text(s, x, ...rest);
      },
      textWidth: (s: string) => s.length * 10,
    } as unknown as p5;
    const propaganda = {
      displayedScore: () => 4210,
      displayedLives: () => 3,
      displayedSuspicion: () => 0,
      displayedAlert: () => ALERT.normal,
      displayedWords: () => [],
      ...shown,
    } as Propaganda;

    new HUD(p, {} as p5.Font, propaganda).draw(bossHealth);
    return { shown: text.mock.calls.map((call) => call[0]), rects, inked };
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

  describe("the words row", () => {
    const word = (view: Partial<WordView>): WordView => ({
      word: "ESCAPE",
      status: "ready",
      pips: 0,
      spent: 0,
      restored: false,
      timeLeft: 0,
      ...view,
    });
    const row = (...views: Partial<WordView>[]) =>
      draw({ displayedWords: () => views.map(word) });
    // The row is the only thing drawn at or below the playfield's bottom.
    const pips = (rects: { color: unknown; y: number }[]) =>
      rects.filter(({ y, color }) => y === 608 && color !== INK);

    it("writes each word's name, two spaces apart, in Propaganda's order", () => {
      const { rects, inked } = row({ word: "FREE" }, { word: "TRUTH" });

      // "FREE" is 40 px wide and two spaces are 20, so TRUTH starts at 8 + 40 + 20.
      expect(
        inked.filter(({ color, x }) => x !== undefined && color !== INK),
      ).toEqual([
        { text: "FREE", color: PAPER, x: 8 },
        { text: "TRUTH", color: PAPER, x: 68 },
      ]);
      expect(rects.filter(({ y }) => y >= 588)).toEqual([]);
    });

    it("shows the level as paper pips under an awake word", () => {
      const { rects } = row({ pips: 2 });

      expect(pips(rects).map(({ color }) => color)).toEqual([PAPER, PAPER]);
    });

    it("greys out a sleeping or recharging word, with steel pips while it recharges", () => {
      const sleeping = row({ status: "dormant" });
      expect(sleeping.inked.at(-1)).toEqual({ text: "ESCAPE", color: STEEL });
      expect(pips(sleeping.rects)).toEqual([]);

      const recharging = row({ status: "recharging", pips: 1 });
      expect(recharging.inked.at(-1)?.color).toBe(STEEL);
      expect(pips(recharging.rects).map(({ color }) => color)).toEqual([STEEL]);
    });

    it("strikes a removed word through in red", () => {
      const { rects, inked } = row({ status: "removed" });

      expect(inked.at(-1)?.color).toBe(STEEL);
      expect(rects.at(-1)).toMatchObject({ color: RED, w: 60 });
    });

    it("shows REMEMBER's spent bombs in concrete", () => {
      const { rects } = row({ word: "REMEMBER", pips: 1, spent: 2 });

      expect(pips(rects).map(({ color }) => color)).toEqual([
        PAPER,
        CONCRETE,
        CONCRETE,
      ]);
    });

    it("gives a restored word leather pips", () => {
      const { rects } = row({ pips: 2, restored: true });

      expect(pips(rects).map(({ color }) => color)).toEqual([LEATHER, LEATHER]);
    });

    it("inverts active TRUTH, with a bar that drains with its time", () => {
      const { rects, inked } = row({
        word: "TRUTH",
        status: "active",
        pips: 1,
        timeLeft: 0.5,
      });

      expect(inked.at(-1)).toMatchObject({ text: "TRUTH", color: INK });
      // The box is the word's 50 px plus 2 px each side; the bar is half of it.
      expect(pips(rects)).toEqual([{ color: PAPER, x: 6, y: 608, w: 27 }]);
    });
  });
});
