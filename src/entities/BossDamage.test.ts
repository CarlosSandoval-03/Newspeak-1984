import type p5 from "p5";
import { describe, expect, it } from "vitest";
import type { Assets } from "../assets";
import { DAMAGE_END } from "../config";
import { BossDamage, regionsShown } from "./BossDamage";

describe("regionsShown", () => {
  it("shows none at full hp, and all of them from DAMAGE_END down", () => {
    expect(regionsShown(6, 1)).toBe(0);
    expect(regionsShown(6, DAMAGE_END)).toBe(6);
    expect(regionsShown(6, 0)).toBe(6);
    expect(regionsShown(6, -0.1)).toBe(6);
  });

  it("shows one more each time the hp falls another equal share", () => {
    const share = (1 - DAMAGE_END) / 6;
    expect(regionsShown(6, 1 - 0.5 * share)).toBe(1);
    expect(regionsShown(6, 1 - 1.5 * share)).toBe(2);
    expect(regionsShown(6, 1 - 5.5 * share)).toBe(6);
  });
});

describe("BossDamage", () => {
  const regions = [
    { x: 1, y: 2, w: 3, h: 4 },
    { x: 5, y: 6, w: 7, h: 8 },
    { x: 9, y: 10, w: 11, h: 12 },
  ];
  const assets = {
    image: {
      "boss-fortress": { width: 128, height: 96 },
      "boss-fortress-damaged": "damaged",
    },
    damage: { "boss-fortress-damage": { regions } },
  } as unknown as Assets;

  // Records what is painted on the boss's graphics, and how many graphics are made.
  const make = () => {
    const painted: unknown[][] = [];
    let made = 0;
    const graphics = {
      noStroke: () => painted.push(["noStroke"]),
      erase: () => painted.push(["erase"]),
      noErase: () => painted.push(["noErase"]),
      rect: (...args: unknown[]) => painted.push(["rect", ...args]),
      image: (...args: unknown[]) => painted.push(["image", ...args]),
    };
    const p = {
      createGraphics: () => {
        made++;
        return graphics;
      },
    } as unknown as p5;
    return {
      damage: new BossDamage(p, "fortress", assets),
      painted,
      made: () => made,
    };
  };

  it("starts as a copy of the clean sprite, made once", () => {
    const { damage, painted, made } = make();
    damage.sprite(1);
    damage.sprite(1);

    expect(made()).toBe(1);
    expect(painted).toEqual([["image", assets.image["boss-fortress"], 0, 0]]);
  });

  it("cuts out each region as it comes due, in order, and only once", () => {
    const { damage, painted } = make();
    damage.sprite(1);
    painted.length = 0;

    damage.sprite(0.9);
    damage.sprite(0.9);
    expect(painted).toEqual([
      ["noStroke"],
      ["erase"],
      ["rect", 1, 2, 3, 4],
      ["noErase"],
      ["image", "damaged", 1, 2, 3, 4, 1, 2, 3, 4],
    ]);

    painted.length = 0;
    damage.sprite(DAMAGE_END);
    expect(painted.filter(([call]) => call === "rect")).toEqual([
      ["rect", 5, 6, 7, 8],
      ["rect", 9, 10, 11, 12],
    ]);
  });
});
