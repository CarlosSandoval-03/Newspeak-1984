import { beforeEach, describe, expect, it } from "vitest";
import { resetGame, state } from "../state";
import { Propaganda } from "./Propaganda";

describe("Propaganda", () => {
  beforeEach(() => resetGame());

  it("passes the real lives and score through, for now", () => {
    const propaganda = new Propaganda();
    state.realLives = 2;
    state.realScore = 4210;

    expect(propaganda.displayedLives()).toBe(2);
    expect(propaganda.displayedScore()).toBe(4210);
  });
});
