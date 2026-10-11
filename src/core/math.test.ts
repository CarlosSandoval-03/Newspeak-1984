import { describe, expect, it } from "vitest";
import {
  angleTo,
  clamp,
  fan,
  radians,
  smoothstep,
  velocity,
  wrapAngle,
} from "./math";

describe("math", () => {
  it("clamps into a range", () => {
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(11, 0, 10)).toBe(10);
  });

  it("eases from rest to rest, and holds outside [0, 1]", () => {
    expect(smoothstep(-1)).toBe(0);
    expect(smoothstep(0.5)).toBe(0.5);
    expect(smoothstep(2)).toBe(1);
    expect(smoothstep(0.1)).toBeLessThan(0.1);
  });

  it("measures angles clockwise from pointing right", () => {
    expect(angleTo({ x: 0, y: 0 }, { x: 0, y: 10 })).toBeCloseTo(Math.PI / 2);
    expect(radians(180)).toBeCloseTo(Math.PI);
  });

  it("wraps an angle into (-π, π]", () => {
    expect(wrapAngle(radians(270))).toBeCloseTo(radians(-90));
    expect(wrapAngle(radians(-190))).toBeCloseTo(radians(170));
  });

  it("turns an angle and a speed into a velocity", () => {
    const { x, y } = velocity(Math.PI / 2, 3);

    expect(x).toBeCloseTo(0);
    expect(y).toBeCloseTo(3);
  });

  it("spreads a fan evenly around its center", () => {
    expect(fan(1, 1, 2)).toEqual([1]);
    expect(fan(0, 3, 2)).toEqual([-1, 0, 1]);
  });
});
