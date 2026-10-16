import type p5 from "p5";
import {
  REBEL_DIARY_THRESHOLD,
  SCROLL_SPEED,
  WORD_MAX_LEVEL,
  WORD_REMOVAL_ORDER,
} from "../config";
import type { SceneManager } from "../core/SceneManager";
import { LEVELS } from "../levels/levels";
import { DictionaryScene } from "../scenes/DictionaryScene";
import { EnlistmentScene } from "../scenes/EnlistmentScene";
import { type Ending, EndingScene } from "../scenes/EndingScene";
import { GameOverScene } from "../scenes/GameOverScene";
import { GameScene } from "../scenes/GameScene";
import { MinistryScene } from "../scenes/MinistryScene";
import { resetGame, state } from "../state";
import { judgeLevel } from "../systems/Ministry";
import { type Stats, VERDICT, type Verdict } from "../types";

// A point of the game to open straight away, named in the URL as `?start=kind:argument`.
export type Flow =
  | { kind: "dictionary" | "level" | "boss" | "landing"; level: number }
  | { kind: "enlistment" | "departure" | "gameover" }
  | { kind: "ministry"; verdict: Verdict }
  | { kind: "ending"; ending: Ending };

const VERDICTS: Record<string, Verdict> = {
  hero: VERDICT.hero,
  review: VERDICT.underReview,
  suspect: VERDICT.suspect,
};

// Enough of a level and of a run for every line of the Ministry and the endings to have something
// to say.
const LEVEL_SCORE = 12000;
const RUN = {
  realScore: 61000,
  officialScore: 38000,
  runStats: {
    kills: 160,
    officialKills: 120,
    eyesDestroyed: 6,
    policeDestroyed: 2,
    framesSeen: 2400,
  },
};

// A level's flight as each verdict would judge it.
const FLOWN: Record<Verdict, Partial<Stats>> = {
  [VERDICT.hero]: { kills: 42 },
  [VERDICT.underReview]: { kills: 10, framesSeen: 300 },
  [VERDICT.suspect]: {
    kills: 20,
    eyesDestroyed: 2,
    policeDestroyed: 1,
    diaries: 1,
  },
};

// Null for anything it doesn't know, so a typo opens the Menu instead of a broken scene.
export function parseFlow(start: string | null): Flow | null {
  const [kind, argument = ""] = (start ?? "").split(":");
  const level = Number(argument || 1);
  const validLevel =
    Number.isInteger(level) && level >= 1 && level <= LEVELS.length;

  switch (kind) {
    case "dictionary":
    case "level":
    case "boss":
    case "landing":
      return validLevel ? { kind, level } : null;
    case "enlistment":
    case "departure":
    case "gameover":
      return { kind };
    case "ministry":
      return argument in VERDICTS
        ? { kind, verdict: VERDICTS[argument] }
        : null;
    case "ending":
      return argument === "obedient" || argument === "rebel"
        ? { kind, ending: argument }
        : null;
    default:
      return null;
  }
}

// A fresh run, with as many diary pages read as asked, put straight where the flow says.
export function startFlow(
  p: p5,
  manager: SceneManager,
  flow: Flow,
  diaries: number,
): void {
  resetGame();
  readDiaries(diaries);

  switch (flow.kind) {
    case "enlistment":
      manager.change(new EnlistmentScene(p, manager));
      return;
    case "dictionary":
      state.level = flow.level;
      manager.change(new DictionaryScene(p, manager));
      return;
    case "level":
      flyLevel(p, manager, flow.level);
      return;
    case "boss":
      flyLevel(p, manager, flow.level, LEVELS[flow.level - 1].length);
      return;
    case "landing":
      clearedLevel(p, manager, flow.level);
      return;
    case "departure":
      readDiaries(Math.max(diaries, REBEL_DIARY_THRESHOLD));
      clearedLevel(p, manager, LEVELS.length);
      return;
    case "ministry":
      judgedLevel(p, manager, flow.verdict);
      return;
    case "ending":
      finishedRun(p, manager, flow.ending);
      return;
    case "gameover":
      manager.change(new GameOverScene(p, manager, p.get()));
  }
}

// Every word, even one the Party has taken, at `level` (0 leaves them asleep), with REMEMBER's
// bombs to match. A later level's Dictionary takes its word again.
export function unlockWords(level: number): void {
  const at = Math.min(Math.max(0, Math.round(level)), WORD_MAX_LEVEL);

  state.words = new Set(WORD_REMOVAL_ORDER);
  for (const word of WORD_REMOVAL_ORDER) state.wordLevels[word] = at;
  state.bombs = at;
}

// Just enough diary pages read for the ending asked for: the rebel's threshold, or one short of
// it. The first pages are the ones read.
export function chooseEnding(ending: Ending): void {
  const { diaries } = state.runStats;
  readDiaries(
    ending === "rebel"
      ? Math.max(diaries, REBEL_DIARY_THRESHOLD)
      : Math.min(diaries, REBEL_DIARY_THRESHOLD - 1),
  );
}

// One page per level, in order, up to the pages there are.
function readDiaries(count: number): void {
  const pages = Math.min(count, LEVELS.length);
  state.runStats.diaries = pages;
  state.runStats.pagesRead = Array.from({ length: pages }, (_, i) => i);
}

// Past the takeoff, with the pilot at the stick; at `scroll` if given, where the city may stop.
function flyLevel(
  p: p5,
  manager: SceneManager,
  level: number,
  scroll?: number,
): GameScene {
  state.level = level;
  const scene = new GameScene(p, manager);
  manager.change(scene);

  const flight = scene["flight"];
  flight["phase"] = "flying";
  flight.speed = SCROLL_SPEED;
  scene["player"].altitude = 1;
  if (scroll !== undefined) flight.scroll = scroll;
  return scene;
}

// At the city's end with the boss already down, so the way out starts at once.
function clearedLevel(p: p5, manager: SceneManager, level: number): void {
  const scene = flyLevel(p, manager, level, LEVELS[level - 1].length);
  scene["bossDown"] = true;
}

function judgedLevel(p: p5, manager: SceneManager, verdict: Verdict): void {
  Object.assign(state.stats, FLOWN[verdict]);
  state.realScore = LEVEL_SCORE;
  manager.change(new MinistryScene(p, manager, judgeLevel()));
}

function finishedRun(p: p5, manager: SceneManager, ending: Ending): void {
  state.level = LEVELS.length;
  state.realScore = RUN.realScore;
  state.officialScore = RUN.officialScore;
  Object.assign(state.runStats, RUN.runStats);
  if (ending === "rebel")
    readDiaries(Math.max(state.runStats.diaries, REBEL_DIARY_THRESHOLD));
  manager.change(new EndingScene(p, manager, ending));
}
