import { beforeEach, describe, expect, it } from "vitest";
import {
  OBEDIENCE_MAX,
  OBEDIENCE_MIN,
  SUSPICION_REVIEW,
  SUSPICION_SUSPECT,
  VERDICT_HERO,
  VERDICT_SUSPECT,
} from "../config";
import { resetGame, state } from "../state";
import { ALERT, type Stats, VERDICT } from "../types";
import {
  correctedKills,
  judgeLevel,
  obedience,
  reportedKills,
  verdictFor,
} from "./Ministry";

const flown = (stats: Partial<Stats>): Stats => ({
  kills: 0,
  eyesDestroyed: 0,
  policeDestroyed: 0,
  framesSeen: 0,
  diaries: 0,
  ...stats,
});

describe("obedience", () => {
  it("rises with kills and falls with towers, time seen, and diaries", () => {
    const base = obedience(flown({}));

    expect(obedience(flown({ kills: 10 }))).toBeGreaterThan(base);
    expect(obedience(flown({ eyesDestroyed: 1 }))).toBeLessThan(base);
    expect(obedience(flown({ framesSeen: 60 }))).toBeLessThan(base);
    expect(obedience(flown({ diaries: 1 }))).toBeLessThan(base);
  });

  it("holds downed police against the pilot more than anything else", () => {
    const police = obedience(flown({ policeDestroyed: 1 }));

    expect(police).toBeLessThan(obedience(flown({ eyesDestroyed: 1 })));
    expect(police).toBeLessThan(obedience(flown({ diaries: 1 })));
  });

  it("lands a good citizen and a rebel where the regime expects them", () => {
    const citizen = obedience(flown({ kills: 45, framesSeen: 120 }));
    const rebel = obedience(
      flown({ kills: 30, eyesDestroyed: 3, framesSeen: 600, diaries: 1 }),
    );

    expect(citizen).toBeGreaterThanOrEqual(1.3);
    expect(citizen).toBeLessThanOrEqual(1.6);
    expect(rebel).toBeGreaterThanOrEqual(OBEDIENCE_MIN);
    expect(rebel).toBeLessThanOrEqual(0.6);
  });

  it("stays within its bounds", () => {
    expect(obedience(flown({ kills: 10000 }))).toBe(OBEDIENCE_MAX);
    expect(obedience(flown({ eyesDestroyed: 100 }))).toBe(OBEDIENCE_MIN);
  });
});

describe("verdictFor", () => {
  it("splits heroes, pilots under review, and suspects at its thresholds", () => {
    expect(verdictFor(VERDICT_HERO)).toBe(VERDICT.hero);
    expect(verdictFor(VERDICT_HERO - 0.01)).toBe(VERDICT.underReview);
    expect(verdictFor(VERDICT_SUSPECT)).toBe(VERDICT.underReview);
    expect(verdictFor(VERDICT_SUSPECT - 0.01)).toBe(VERDICT.suspect);
  });
});

describe("correctedKills", () => {
  it("rounds a hero's up, halves a pilot's under review, and erases a suspect's", () => {
    expect(correctedKills(42, VERDICT.hero)).toBe(50);
    expect(correctedKills(40, VERDICT.hero)).toBe(40);
    expect(correctedKills(42, VERDICT.underReview)).toBe(21);
    expect(correctedKills(43, VERDICT.underReview)).toBe(21);
    expect(correctedKills(42, VERDICT.suspect)).toBe(0);
  });
});

describe("reportedKills", () => {
  it("files the downed police as enemy aircraft", () => {
    expect(reportedKills(flown({ kills: 41, policeDestroyed: 1 }))).toBe(42);
  });
});

describe("judgeLevel", () => {
  beforeEach(() => {
    resetGame();
    state.levelStartScore = 1000;
    state.officialScore = 800;
    state.runStats.officialKills = 5;
  });

  it("records the level's real score scaled by obedience, by hand", () => {
    // 1 + 42 × 0.01 = 1.42: a hero.
    state.realScore = 1000 + 3333;
    state.stats = flown({ kills: 42 });

    const report = judgeLevel();

    expect(report).toEqual({
      stats: flown({ kills: 42 }),
      realScore: 3333,
      officialScore: Math.round(3333 * 1.42),
      officialKills: 50,
      verdict: VERDICT.hero,
    });
    expect(state.officialScore).toBe(800 + 4733);
    expect(state.runStats.officialKills).toBe(5 + 50);
    expect(state.realScore).toBe(4333);
  });

  it("keeps the verdict and rewrites suspicion from it, whatever it really was", () => {
    const cases = [
      [flown({ kills: 42 }), VERDICT.hero, 0, ALERT.normal],
      [flown({}), VERDICT.underReview, SUSPICION_REVIEW, ALERT.normal],
      [flown({ diaries: 2 }), VERDICT.suspect, SUSPICION_SUSPECT, ALERT.alert],
    ] as const;

    for (const [stats, verdict, suspicion, alert] of cases) {
      state.stats = stats;
      state.suspicion = 90;
      state.alertLevel = ALERT.pursuit;

      expect(judgeLevel().verdict).toBe(verdict);
      expect(state).toMatchObject({
        verdict,
        suspicion,
        alertLevel: alert,
      });
    }
  });

  it("corrects the downed police along with the kills, while holding them against the pilot", () => {
    // 1 + 41 × 0.01 − 0.5 = 0.91: under review, so 42 reported kills are halved.
    state.stats = flown({ kills: 41, policeDestroyed: 1 });

    const report = judgeLevel();

    expect(report.verdict).toBe(VERDICT.underReview);
    expect(report.officialKills).toBe(21);
  });

  it("keeps a copy of the stats, so clearing the level doesn't change the report", () => {
    state.stats = flown({ kills: 3 });
    const report = judgeLevel();
    state.stats.kills = 0;

    expect(report.stats.kills).toBe(3);
  });
});
