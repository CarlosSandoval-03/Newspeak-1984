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
