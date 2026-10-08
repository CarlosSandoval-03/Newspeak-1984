import { describe, expect, it } from "vitest";
import { circlesOverlap } from "./Collisions";

const circle = (x: number, y: number, radius: number) => ({
  pos: { x, y },
  radius,
});

describe("circlesOverlap", () => {
  it("overlaps when the centers are closer than the radii combined", () => {
    expect(circlesOverlap(circle(0, 0, 5), circle(3, 4, 1))).toBe(true);
  });

  it("doesn't count circles that only touch", () => {
    expect(circlesOverlap(circle(0, 0, 4), circle(3, 4, 1))).toBe(false);
  });

  it("doesn't overlap circles apart", () => {
    expect(circlesOverlap(circle(0, 0, 2), circle(30, 40, 2))).toBe(false);
  });
});
