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
