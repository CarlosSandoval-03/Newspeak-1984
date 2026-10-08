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

// Later steps add "homing".
export type EnemyKind = "straight" | "sine" | "bomber";

export interface WaveDef {
  // Scroll distance at which the wave enters at the top edge.
  at: number;
  kind: EnemyKind;
  count: number;
  // Spawn x of the first enemy; the rest follow to its right.
  x: number;
  spacing: number;
}

// The recipe describes intent, not tiles; later steps add the river, railway, and landmark.
export interface TerrainDef {
  seed: number;
  // Shares of the city blocks; the rest stay open asphalt.
  blocks: { plaza: number; rubble: number };
}

// Where a ground element can stand; later steps add bridge, railway, landmark, and platform.
export type AnchorKind = "street" | "plaza" | "rooftop" | "skylight";

// Later steps add eyes, turrets, pickups, the diary, the boss, and the length.
export interface LevelDef {
  terrain: TerrainDef;
  waves: WaveDef[];
}

// Ordered, because each level keeps the effects of the ones below it.
export const ALERT = {
  normal: 0,
  alert: 1,
  pursuit: 2,
  thoughtPolice: 3,
} as const;

export type AlertLevel = (typeof ALERT)[keyof typeof ALERT];

export interface GameState {
  // Zero-padded once here, so every place that shows it agrees.
  pilotId: string;
  level: number;
  realLives: number;
  // The whole run; the regime never shows it until the rebel ending.
  realScore: number;
  suspicion: number;
  alertLevel: AlertLevel;
  words: Set<Word>;
  // This level only.
  stats: {
    kills: number;
    eyesDestroyed: number;
    framesSeen: number;
    diaries: number;
  };
}
