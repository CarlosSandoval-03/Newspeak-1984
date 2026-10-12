import type p5 from "p5";
import {
  ALERT_THRESHOLDS,
  INK,
  PAPER,
  STARTING_LIVES,
  STEEL,
  SUSPICION_MAX,
  WORD_MAX_LEVEL,
  WORD_REMOVAL_ORDER,
} from "../config";
import { toSeconds } from "../core/math";
import type { SceneManager } from "../core/SceneManager";
import type { Entity } from "../entities/Entity";
import { LEVELS } from "../levels/levels";
import { earnedEnding } from "../scenes/EndingScene";
import { GameScene } from "../scenes/GameScene";
import { record, state } from "../state";
import { clearHonorRoll, recordRun } from "../systems/HonorRoll";
import { obedience, standingScore, verdictFor } from "../systems/Ministry";
import type { LieField } from "../systems/Propaganda";
import { ALERT } from "../types";
import { chooseEnding, parseFlow, startFlow, unlockWords } from "./flows";
import { type ResetScope, resetStorage, sandboxStorage } from "./sandbox";

// Inside the sandbox, like everything a debug session stores.
const SETTINGS_KEY = "newspeak1984.tools";
const TOGGLE_KEY = "Backquote";
const PANEL = { x: 4, y: 64, w: 472, lineHeight: 16, padding: 6 };
const TEXT_SIZE = 16;
const PANEL_ALPHA = 0.85;
const VERDICT_NAMES = ["hero", "under review", "suspect"];
const ALERT_NAMES = Object.keys(ALERT);
// Enough runs of both kinds, some already erased, for the Ministry to tamper with.
const SAMPLE_ROLL = [
  { pilotId: "0451", score: 64000, unperson: false },
  { pilotId: "1949", score: 52000, unperson: false },
  { pilotId: "0101", score: 47000, unperson: true },
  { pilotId: "2084", score: 39000, unperson: false },
  { pilotId: "6079", score: 31000, unperson: false },
  { pilotId: "0007", score: 0, unperson: true },
];

// Kept across reloads, so a tool stays on while the game is being tested.
interface Settings {
  panel: boolean;
  infiniteLives: boolean;
  hitboxes: boolean;
}

interface Command {
  code: string;
  label: string;
  run: (settings: Settings, game: GameScene | null) => void;
}

// Each needs the game running, except the toggles.
const COMMANDS: Command[] = [
  {
    code: "Digit1",
    label: "lives",
    run: (settings) => (settings.infiniteLives = !settings.infiniteLives),
  },
  { code: "Digit2", label: "to boss", run: (_, game) => game && toBoss(game) },
  {
    code: "Digit3",
    label: "kill giant",
    run: (_, game) => game && killGiant(game),
  },
  {
    code: "Digit4",
    label: "end level",
    run: (_, game) => game?.["leaveLevel"](),
  },
  { code: "Digit5", label: "read diary", run: () => readDiary() },
  {
    code: "Digit6",
    label: "suspicion+",
    run: (_, game) => game?.["suspicion"].add(ALERT_THRESHOLDS.alert),
  },
  {
    code: "Digit7",
    label: "suspicion 0",
    run: (_, game) => game && clearSuspicion(game),
  },
  { code: "Digit8", label: "words +1", run: () => raiseWords() },
  {
    code: "Digit9",
    label: "hitboxes",
    run: (settings) => (settings.hitboxes = !settings.hitboxes),
  },
  {
    code: "Digit0",
    label: "other ending",
    run: () => chooseEnding(earnedEnding() === "rebel" ? "obedient" : "rebel"),
  },
];

// Dev server only, with `?debug=true`: resets storage if asked, moves the game into its sandbox,
// opens the flow the URL names, listens for the debug keys, and after every frame keeps the lives
// full and draws the hitboxes and the panel, as their settings say.
export function installDebug(p: p5, manager: SceneManager): void {
  const params = new URLSearchParams(location.search);

  // On the real storage first, then nothing outside the sandbox is touched again.
  const reset = params.get("reset");
  if (isResetScope(reset)) resetStorage(reset);
  sandboxStorage();
  const settings = loadSettings();

  // The archive first, so a flow that shows it finds it ready.
  seedHonorRoll(params.get("honorroll"));
  const flow = parseFlow(params.get("start"));
  if (flow)
    startFlow(p, manager, flow, Number(params.get("diaries") ?? 0) || 0);
  // After the flow, whose level has already taken its words.
  const words = params.get("words");
  if (words !== null) unlockWords(Number(words) || 0);
  const ending = params.get("ending");
  if (ending === "rebel" || ending === "obedient") chooseEnding(ending);

  window.addEventListener("keydown", (event) => {
    if (handleKey(event.code, settings, currentGame(manager)))
      event.preventDefault();
  });

  const frame = manager.frame.bind(manager);
  manager.frame = (ms) => {
    frame(ms);
    afterFrame(p, manager, settings);
  };
}

function isResetScope(scope: string | null): scope is ResetScope {
  return scope === "debug" || scope === "all";
}

// The toggle key always; the commands only while the panel shows them. True if the key was used.
function handleKey(
  code: string,
  settings: Settings,
  game: GameScene | null,
): boolean {
  if (code === TOGGLE_KEY) settings.panel = !settings.panel;
  else {
    const command = settings.panel
      ? COMMANDS.find((command) => command.code === code)
      : undefined;
    if (!command) return false;
    command.run(settings, game);
  }
  saveSettings(settings);
  return true;
}

function afterFrame(p: p5, manager: SceneManager, settings: Settings): void {
  const game = currentGame(manager);

  if (settings.infiniteLives) state.realLives = STARTING_LIVES;
  if (settings.hitboxes && game) drawHitboxes(p, game);
  if (settings.panel) drawPanel(p, manager, panelLines(settings, game));
}

function currentGame(manager: SceneManager): GameScene | null {
  const scene = manager["scene"];
  return scene instanceof GameScene ? scene : null;
}

// Straight to where the city stops; the waves not yet flown never come.
function toBoss(game: GameScene): void {
  const flight = game["flight"];
  if (flight.flying)
    flight.scroll = Math.max(flight.scroll, LEVELS[state.level - 1].length);
}

// As if shot down: scored, recorded, and exploded like any other kill.
function killGiant(game: GameScene): void {
  const giant = game["boss"] ?? game["police"];
  if (giant?.hit(Number.MAX_SAFE_INTEGER)) game["kill"](giant);
}

// This level's page, as if picked up, without the suspicion or the word it gives back.
function readDiary(): void {
  const page = state.level - 1;
  if (state.runStats.pagesRead.includes(page)) return;
  record("diaries");
  state.runStats.pagesRead.push(page);
}

// Released first, since at the top suspicion is frozen until the Thought Police go.
function clearSuspicion(game: GameScene): void {
  const suspicion = game["suspicion"];
  suspicion.release();
  suspicion.add(-SUSPICION_MAX);
}

// All four words one level up from the lowest of them, back to asleep after the top.
function raiseWords(): void {
  const lowest = Math.min(...Object.values(state.wordLevels));
  unlockWords((lowest + 1) % (WORD_MAX_LEVEL + 1));
}

// `seed` fills the archive with sample runs, `clear` empties it.
function seedHonorRoll(action: string | null): void {
  if (action === "clear") clearHonorRoll();
  if (action === "seed") SAMPLE_ROLL.forEach(recordRun);
}

// What the game hides, as plain lines: where the run stands, what the Ministry would make of the
// level so far, and the keys.
function panelLines(settings: Settings, game: GameScene | null): string[] {
  const { stats } = state;
  const factor = obedience(stats);
  const lines = [
    `DEBUG  [\`] hide   level ${state.level}   lives ${settings.infiniteLives ? "INF" : state.realLives}`,
    `suspicion ${Math.round(state.suspicion)}  ${ALERT_NAMES[state.alertLevel]}`,
    `run diaries ${state.runStats.diaries} (pages ${state.runStats.pagesRead.map((page) => page + 1).join(",") || "-"})  ending ${earnedEnding()}`,
    `kills ${stats.kills}  eyes ${stats.eyesDestroyed}  police ${stats.policeDestroyed}  seen ${toSeconds(stats.framesSeen)}s  diaries ${stats.diaries}`,
    `obedience ${factor.toFixed(2)} ${VERDICT_NAMES[verdictFor(factor)]}   last verdict ${VERDICT_NAMES[state.verdict]}`,
    `score real ${state.realScore}  official ${state.officialScore}  standing ${standingScore()}`,
    wordsLine(),
  ];

  if (game) lines.push(flightLine(game), liesLine(game));
  lines.push(
    ...chunks(
      COMMANDS.map(({ code, label }) => `[${code.slice(-1)}] ${label}`),
      3,
    ),
  );
  return lines;
}

// Each word's level, or a dash once the Party has taken it.
function wordsLine(): string {
  const words = WORD_REMOVAL_ORDER.map(
    (word) => `${word} ${state.words.has(word) ? state.wordLevels[word] : "-"}`,
  );
  return `words ${words.join("  ")}  bombs ${state.bombs}`;
}

// Which of the regime's lies is on screen right now, and whose war it is.
function liesLine(game: GameScene): string {
  const propaganda = game["propaganda"];
  const fields: LieField[] = ["ticker"];
  const lies = fields.map(
    (field) => `${field} ${propaganda.isLying(field) ? "LIE" : "true"}`,
  );
  return `lying ${lies.join("  ")}   enemy ${propaganda.enemy}`;
}

function flightLine(game: GameScene): string {
  const flight = game["flight"];
  const giant = game["boss"] ?? game["police"];
  const length = LEVELS[state.level - 1].length;
  const health = giant ? `${Math.round(giant.health * 100)}%` : "-";

  return `flight ${flight["phase"]}  scroll ${Math.round(flight.scroll)}/${length}  giant ${health}`;
}

function chunks(items: string[], size: number): string[] {
  const rows: string[] = [];
  for (let i = 0; i < items.length; i += size)
    rows.push(items.slice(i, i + size).join("  "));
  return rows;
}

function drawPanel(p: p5, manager: SceneManager, lines: string[]): void {
  const { x, y, w, lineHeight, padding } = PANEL;
  const context = p.drawingContext as CanvasRenderingContext2D;

  p.push();
  p.noStroke();
  context.globalAlpha = PANEL_ALPHA;
  p.fill(INK);
  p.rect(x, y, w, lines.length * lineHeight + padding * 2);
  context.globalAlpha = 1;

  p.fill(PAPER);
  p.textFont(manager.assets.font.machine);
  p.textSize(TEXT_SIZE);
  p.textAlign(p.LEFT, p.TOP);
  lines.forEach((line, i) =>
    p.text(line, x + padding, y + padding + i * lineHeight),
  );
  p.pop();
}

// The circles collisions are checked against: the pilot in paper, everything else in steel.
function drawHitboxes(p: p5, game: GameScene): void {
  const hostile: (Entity | null)[] = [
    ...game["enemies"],
    ...game["eyes"],
    ...game["turrets"],
    ...game["bullets"],
    ...game["pickups"],
    game["diary"],
    game["boss"],
    game["police"],
  ];

  p.push();
  p.noFill();
  p.strokeWeight(1);
  p.stroke(STEEL);
  for (const entity of hostile) if (entity) circle(p, entity);
  p.stroke(PAPER);
  circle(p, game["player"]);
  p.pop();
}

function circle(p: p5, { pos, radius }: Entity): void {
  p.circle(pos.x, pos.y, radius * 2);
}

// Anything unreadable starts every tool off.
function loadSettings(): Settings {
  let saved: unknown = null;
  try {
    saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "null");
  } catch {
    // Blocked or damaged storage: the defaults stand.
  }
  const on = (name: keyof Settings) =>
    typeof saved === "object" &&
    saved !== null &&
    Reflect.get(saved, name) === true;

  return {
    panel: on("panel"),
    infiniteLives: on("infiniteLives"),
    hitboxes: on("hitboxes"),
  };
}

function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // The tools still work; they just start off again after a reload.
  }
}
