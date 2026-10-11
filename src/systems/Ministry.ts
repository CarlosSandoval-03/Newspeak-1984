import {
  HERO_KILLS_ROUNDING,
  OBEDIENCE_BASE,
  OBEDIENCE_MAX,
  OBEDIENCE_MIN,
  SUSPICION_REVIEW,
  SUSPICION_SUSPECT,
  VERDICT_HERO,
  VERDICT_SUSPECT,
  W_DIARY,
  W_EYE,
  W_KILL,
  W_SEEN,
} from "../config";
import { clamp } from "../core/math";
import { state } from "../state";
import { type Stats, VERDICT, type Verdict } from "../types";
import { alertFor } from "./Suspicion";

// A level as flown and as recorded, for the Records Department to type out.
export interface Report {
  stats: Stats;
  realScore: number;
  officialScore: number;
  officialKills: number;
  verdict: Verdict;
}

// The verdict, not the facts, decides where the next level's suspicion starts.
const SUSPICION_AFTER: Record<Verdict, number> = {
  [VERDICT.hero]: 0,
  [VERDICT.underReview]: SUSPICION_REVIEW,
  [VERDICT.suspect]: SUSPICION_SUSPECT,
};

export function obedience({
  kills,
  eyesDestroyed,
  framesSeen,
  diaries,
}: Stats): number {
  return clamp(
    OBEDIENCE_BASE +
      kills * W_KILL -
      eyesDestroyed * W_EYE -
      framesSeen * W_SEEN -
      diaries * W_DIARY,
    OBEDIENCE_MIN,
    OBEDIENCE_MAX,
  );
}

export function verdictFor(obedience: number): Verdict {
  if (obedience >= VERDICT_HERO) return VERDICT.hero;
  if (obedience < VERDICT_SUSPECT) return VERDICT.suspect;
  return VERDICT.underReview;
}

// A hero's are rounded up, a pilot under review shares them with the squadron, a suspect's never happened.
export function correctedKills(kills: number, verdict: Verdict): number {
  if (verdict === VERDICT.hero)
    return Math.ceil(kills / HERO_KILLS_ROUNDING) * HERO_KILLS_ROUNDING;
  if (verdict === VERDICT.underReview) return Math.floor(kills / 2);
  return 0;
}

// Closes the level's file: the real score is scaled by obedience into the official record, and the
// verdict is kept for the next briefing and rewrites the suspicion the next level starts with.
export function judgeLevel(): Report {
  const { stats } = state;
  const factor = obedience(stats);
  const verdict = verdictFor(factor);
  const realScore = state.realScore - state.levelStartScore;
  const report = {
    stats: { ...stats },
    realScore,
    officialScore: Math.round(realScore * factor),
    officialKills: correctedKills(stats.kills, verdict),
    verdict,
  };

  state.officialScore += report.officialScore;
  state.runStats.officialKills += report.officialKills;
  state.verdict = verdict;
  state.suspicion = SUSPICION_AFTER[verdict];
  state.alertLevel = alertFor(state.suspicion);
  return report;
}
