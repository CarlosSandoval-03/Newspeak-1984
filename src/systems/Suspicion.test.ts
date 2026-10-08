import { beforeEach, describe, expect, it } from "vitest";
import {
  SUSPICION_DECAY,
  SUSPICION_MAX,
  SUSPICION_RISE_FAR,
  SUSPICION_RISE_NEAR,
} from "../config";
import type { Eye } from "../entities/Eye";
import { resetGame, state } from "../state";
import { ALERT } from "../types";
import { alertFor, Suspicion } from "./Suspicion";

const player = { x: 0, y: 0 };
// Only where an eye is and how far it sees matter here.
const eyeAt = (distance: number, range = 100) =>
  ({ pos: { x: distance, y: 0 }, range }) as Eye;

describe("Suspicion", () => {
  let suspicion: Suspicion;

  beforeEach(() => {
    resetGame();
    suspicion = new Suspicion();
  });

  it("rises faster the closer the eye that sees the player", () => {
    suspicion.update([eyeAt(0)], player);
    expect(state.suspicion).toBeCloseTo(SUSPICION_RISE_NEAR);

    state.suspicion = 0;
    suspicion.update([eyeAt(50)], player);
    expect(state.suspicion).toBeCloseTo(
      (SUSPICION_RISE_NEAR + SUSPICION_RISE_FAR) / 2,
    );

    state.suspicion = 0;
    suspicion.update([eyeAt(100)], player);
    expect(state.suspicion).toBeCloseTo(SUSPICION_RISE_FAR);
  });

  it("counts the eye with the player deepest in its range", () => {
    suspicion.update([eyeAt(90), eyeAt(20), eyeAt(60, 300)], player);

    expect(state.suspicion).toBeCloseTo(
      SUSPICION_RISE_NEAR + (SUSPICION_RISE_FAR - SUSPICION_RISE_NEAR) * 0.2,
    );
  });

  it("decays out of sight, never below zero", () => {
    state.suspicion = 10;
    suspicion.update([], player);
    expect(state.suspicion).toBeCloseTo(10 - SUSPICION_DECAY);

    state.suspicion = 0.01;
    suspicion.update([], player);
    expect(state.suspicion).toBe(0);
  });

  it("never goes past the top, by sight or all at once", () => {
    state.suspicion = SUSPICION_MAX - 0.1;
    suspicion.update([eyeAt(0)], player);
    expect(state.suspicion).toBe(SUSPICION_MAX);

    suspicion.add(15);
    expect(state.suspicion).toBe(SUSPICION_MAX);
  });

  it("adds instant changes and updates the alert level with them", () => {
    state.suspicion = 20;
    suspicion.add(15);

    expect(state.suspicion).toBe(35);
    expect(state.alertLevel).toBe(ALERT.alert);
  });

  it("counts only the frames the player is seen", () => {
    suspicion.update([eyeAt(10)], player);
    suspicion.update([], player);
    suspicion.update([eyeAt(10)], player);

    expect(state.stats.framesSeen).toBe(2);
  });
});

describe("alertFor", () => {
  it("raises the alert level at each threshold", () => {
    expect(alertFor(0)).toBe(ALERT.normal);
    expect(alertFor(33.9)).toBe(ALERT.normal);
    expect(alertFor(34)).toBe(ALERT.alert);
    expect(alertFor(66.9)).toBe(ALERT.alert);
    expect(alertFor(67)).toBe(ALERT.pursuit);
    expect(alertFor(99.9)).toBe(ALERT.pursuit);
    expect(alertFor(100)).toBe(ALERT.thoughtPolice);
  });
});
