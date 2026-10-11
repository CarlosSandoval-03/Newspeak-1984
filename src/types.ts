export type Vec = { x: number; y: number };

type Corner = "lower" | "upper";

export interface TilesetDef {
  tileSize: number;
  lower: string;
  upper: string;
  tiles: {
    corners: { NW: Corner; NE: Corner; SW: Corner; SE: Corner };
    x: number;
    y: number;
  }[];
}

export interface DamageMap {
  sprite: string;
  damaged: string;
  regions: { x: number; y: number; w: number; h: number }[];
}

export interface PlatformDef {
  sprite: string;
  park: Vec;
  liftoff: Vec;
  touchdown: Vec;
  lamps: Vec[];
}

export type Word = "FREE" | "ESCAPE" | "TRUTH" | "REMEMBER";

export type EnemyKind = "straight" | "sine" | "bomber" | "homing" | "escort";

export interface WaveDef {
  // Scroll distance at which the wave enters at the top edge.
  at: number;
  // Autogyros and the escort only come when suspicion calls them, so their silhouettes always mean it.
  kind: Exclude<EnemyKind, "homing" | "escort">;
  count: number;
  // Spawn x of the first enemy; the rest follow to its right.
  x: number;
  spacing: number;
  // Carried by the wave's last enemy, and dropped only if it is shot down.
  drops?: Word;
  // Nearly invisible unless TRUTH is active; from level 2 on.
  camo?: boolean;
}

// Falls in from the top edge at `x`, like a drone, since it is not on the ground.
export interface PickupDef {
  at: number;
  x: number;
  word: Word;
}

// The recipe describes intent, not tiles; later steps add the river, railway, and landmark.
export interface TerrainDef {
  seed: number;
  // Shares of the city blocks; the rest stay open asphalt.
  blocks: { plaza: number; rubble: number };
}

// Where a ground element can stand; later steps add bridge, railway, and landmark.
export type AnchorKind = "street" | "plaza" | "rooftop" | "skylight";

export type EyeType = "tower" | "drone";

// Angles in degrees, clockwise from pointing right because screen y grows downward: 90 looks down.
interface ConeDef {
  facing: number;
  range: number;
  sweepAmp: number;
  // Radians of sweep phase per frame.
  sweepSpeed: number;
  aperture?: number;
}

// A tower stands on the ground, `x` only picking a side; a drone flies, so its x is where it is.
export type EyeDef = ConeDef &
  (
    | { type: "tower"; at: number; on: AnchorKind; x?: number }
    | { type: "drone"; at: number; x: number; path: "patrol" | "sine" }
  );

// On the ground, `x` only says which side to prefer among anchors equally near `at`.
export interface TurretDef {
  at: number;
  on: AnchorKind;
  x?: number;
}

export type BossKind = "fortress" | "airship" | "landship" | "wing" | "eye";

// `count` bullets over `spread` degrees, centered on the player or straight down.
export interface VolleyDef {
  aim: "player" | "down";
  count: number;
  spread: number;
}

// A phase starts once the boss's share of hp left falls to `from`; its volleys take turns.
export interface PhaseDef {
  from: number;
  interval: number;
  volleys: VolleyDef[];
}

export interface BossDef {
  halfSize: number;
  radius: number;
  hp: number;
  score: number;
  // A ground boss rides a street in and sways along it, under the plane; an air boss sways across the sky.
  ground: boolean;
  // The Party's own: red bullets and a red hp bar.
  regime: boolean;
  hoverY: number;
  sway: { amp: number; period: number };
  phases: PhaseDef[];
}

export interface LevelDef {
  terrain: TerrainDef;
  // The scroll distance at which the city stops and the level ends.
  length: number;
  waves: WaveDef[];
  eyes: EyeDef[];
  turrets: TurretDef[];
  pickups: PickupDef[];
  // On the skylight nearest `at`, so players learn where to look.
  diary: { at: number };
  // Comes once the city stops at `length`; the landing waits for it to go down.
  boss: BossKind;
}

// Ordered, because each level keeps the effects of the ones below it.
export const ALERT = {
  normal: 0,
  alert: 1,
  pursuit: 2,
  thoughtPolice: 3,
} as const;

export type AlertLevel = (typeof ALERT)[keyof typeof ALERT];

export type Stats = {
  kills: number;
  eyesDestroyed: number;
  framesSeen: number;
  diaries: number;
};

export interface GameState {
  // Zero-padded once here, so every place that shows it agrees.
  pilotId: string;
  level: number;
  realLives: number;
  // The whole run; the regime never shows it until the rebel ending.
  realScore: number;
  suspicion: number;
  alertLevel: AlertLevel;
  // Available right now: what removal left, plus any word a diary gave back for this level.
  words: Set<Word>;
  // 0 while a word sleeps, before its first pickup. Kept when a word is removed, so a diary
  // gives it back as strong as it was.
  wordLevels: Record<Word, number>;
  restoredWord: Word | null;
  bombs: number;
  // This level only.
  stats: Stats;
  runStats: Stats & { pagesRead: number[] };
}
