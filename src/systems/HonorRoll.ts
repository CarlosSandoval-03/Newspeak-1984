import {
  HONOR_ROLL_SIZE,
  SCORE_ALTER_CHANCE,
  SCORE_ALTER_MAX,
  SCORE_ALTER_MIN,
  SCORE_ERASE_CHANCE,
} from "../config";

// Data, not text: the table is written in whatever language is current when it is shown.
export interface HonorRollEntry {
  pilotId: string;
  score: number;
  unperson: boolean;
}

// The archive as it was and as the Ministry left it, row for row, so the change can be watched.
export interface Tampering {
  before: HonorRollEntry[];
  after: HonorRollEntry[];
}

const STORAGE_KEY = "newspeak1984.scores";

// Stands in for storage when it is blocked, so the table still lasts the session.
let session: HonorRollEntry[] = [];

export function readHonorRoll(): HonorRollEntry[] {
  let saved: string | null;
  try {
    saved = localStorage.getItem(STORAGE_KEY);
  } catch {
    return session;
  }
  return saved === null ? [] : parse(saved);
}

// Once, when the run ends: under its pilot if finished, as an unperson whose number the Party keeps
// if lost. A run abandoned mid-way never reaches the archive.
export function recordRun(entry: HonorRollEntry): void {
  write(ranked([...readHonorRoll(), entry]));
}

export function clearHonorRoll(): void {
  write([]);
}

// At every Ministry visit; saved ranked, so the next visit finds the archive already reordered.
export function tamperHonorRoll(random = Math.random): Tampering {
  const before = readHonorRoll();
  const after = tampered(before, random);

  write(ranked(after));
  return { before, after };
}

// Each entry may become an unperson, or else have its score scaled; an unperson stays one.
export function tampered(
  entries: readonly HonorRollEntry[],
  random: () => number,
): HonorRollEntry[] {
  return entries.map((entry) => {
    if (entry.unperson) return entry;
    if (random() < SCORE_ERASE_CHANCE)
      return { ...entry, score: 0, unperson: true };
    if (random() >= SCORE_ALTER_CHANCE) return entry;

    const factor =
      SCORE_ALTER_MIN + random() * (SCORE_ALTER_MAX - SCORE_ALTER_MIN);
    return { ...entry, score: Math.round(entry.score * factor) };
  });
}

// The run being flown, shown among the archive at its place but never stored until it ends. It
// sits on the same row before and after, so only the past runs are seen to change.
export function withRun(
  { before, after }: Tampering,
  run: HonorRollEntry,
): Tampering {
  const place = before.filter(({ score }) => score >= run.score).length;
  const insert = (entries: HonorRollEntry[]) =>
    [...entries.slice(0, place), run, ...entries.slice(place)].slice(
      0,
      HONOR_ROLL_SIZE,
    );

  return { before: insert(before), after: insert(after) };
}

function ranked(entries: readonly HonorRollEntry[]): HonorRollEntry[] {
  return [...entries]
    .sort((a, b) => b.score - a.score)
    .slice(0, HONOR_ROLL_SIZE);
}

function write(entries: HonorRollEntry[]): void {
  session = entries;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // The table still lasts the session; it just won't survive a reload.
  }
}

// Anything but a list of well-formed entries is a damaged archive, and starts over empty.
function parse(saved: string): HonorRollEntry[] {
  try {
    const entries: unknown = JSON.parse(saved);
    return Array.isArray(entries) && entries.every(isEntry) ? entries : [];
  } catch {
    return [];
  }
}

function isEntry(entry: unknown): entry is HonorRollEntry {
  return (
    typeof entry === "object" &&
    entry !== null &&
    "pilotId" in entry &&
    typeof entry.pilotId === "string" &&
    "score" in entry &&
    Number.isFinite(entry.score) &&
    "unperson" in entry &&
    typeof entry.unperson === "boolean"
  );
}
