import { beforeEach, describe, expect, it } from "vitest";
import { resetGame, state } from "../state";
import { ALERT } from "../types";
import { Propaganda } from "./Propaganda";

describe("Propaganda", () => {
  beforeEach(() => resetGame());

  it("passes the real values through, for now", () => {
    const propaganda = new Propaganda();
    state.realLives = 2;
    state.realScore = 4210;
    state.suspicion = 42;
    state.alertLevel = ALERT.alert;

    expect(propaganda.displayedLives()).toBe(2);
    expect(propaganda.displayedScore()).toBe(4210);
    expect(propaganda.displayedSuspicion()).toBe(42);
    expect(propaganda.displayedAlert()).toBe(ALERT.alert);
  });
});
