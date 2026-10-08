import {
  BANNER_CHANCE,
  BUILDING_CHANCE,
  CANVAS_WIDTH,
  CELL_SIZE,
  CHUNK_HEIGHT,
  CRATER_CHANCE,
  MAX_BLOCK_CELLS,
  MIN_BLOCK_CELLS,
  SKYLIGHT_CHANCE,
} from "../config";
import type { TerrainDef, Vec } from "../types";

export type Terrain = "asphalt" | "plaza" | "rubble";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Building extends Rect {
  skylight: Rect | null;
  banner: Rect | null;
}

// Positions are in chunk pixels, with y = 0 at the chunk's top edge.
export interface ChunkLayout {
  // Terrain on tile corners: (ROWS + 1) × (COLUMNS + 1), indexed [row][column].
  corners: Terrain[][];
  buildings: Building[];
  craters: Vec[];
}

export const COLUMNS = CANVAS_WIDTH / CELL_SIZE;
export const ROWS = CHUNK_HEIGHT / CELL_SIZE;

const SKYLIGHT_SIZE = 24;
const BANNER_WIDTH = 8;
// A banner hangs two to four folds long.
const BANNER_FOLD = 12;

// mulberry32: a few lines of seeded randomness, apart from p5's, so gameplay never changes the map.
function random(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const between = (rng: () => number, min: number, max: number) =>
  min + Math.floor(rng() * (max - min + 1));

// One-cell streets across `length` cells, leaving blocks of at least MIN_BLOCK_CELLS on every side.
function streets(rng: () => number, first: number, length: number): number[] {
  const found: number[] = [];
  let at = first + between(rng, MIN_BLOCK_CELLS, MAX_BLOCK_CELLS);

  while (at + 1 + MIN_BLOCK_CELLS <= length) {
    found.push(at);
    at += 1 + between(rng, MIN_BLOCK_CELLS, MAX_BLOCK_CELLS);
  }
  return found;
}

// Chosen once per level, so the vertical streets run unbroken from chunk to chunk.
export function streetColumns(seed: number): number[] {
  return streets(random(seed), 0, COLUMNS);
}

// The cell spans between streets, as [first, end) pairs.
function spans(streetCells: number[], first: number, length: number) {
  const edges = [first - 1, ...streetCells, length];
  return edges.slice(1).map((end, i) => [edges[i] + 1, end] as const);
}

export function chunkLayout(terrain: TerrainDef, index: number): ChunkLayout {
  const rng = random(terrain.seed + index);
  const corners: Terrain[][] = Array.from({ length: ROWS + 1 }, () =>
    Array<Terrain>(COLUMNS + 1).fill("asphalt"),
  );
  const buildings: Building[] = [];

  // Row 0 is always a street, and every block stays clear of the bottom edge's corners,
  // so chunks join on asphalt whatever their neighbors hold.
  const columns = spans(streetColumns(terrain.seed), 0, COLUMNS);
  const rows = spans(streets(rng, 1, ROWS), 1, ROWS);

  for (const [top, bottom] of rows) {
    for (const [left, right] of columns) {
      const roll = rng();
      const kind: Terrain =
        roll < terrain.blocks.plaza
          ? "plaza"
          : roll < terrain.blocks.plaza + terrain.blocks.rubble
            ? "rubble"
            : "asphalt";
      if (kind === "asphalt") continue;

      // Inner corners only, so each block's edge cells hold its curb and the streets stay pure asphalt.
      // A block at the screen's side runs off it, with no curb there.
      const firstColumn = left === 0 ? 0 : left + 1;
      const lastColumn = right === COLUMNS ? COLUMNS : right - 1;
      for (let row = top + 1; row <= bottom - 1; row++)
        for (let column = firstColumn; column <= lastColumn; column++)
          corners[row][column] = kind;

      if (kind === "plaza" && rng() < BUILDING_CHANCE)
        buildings.push(building(rng, left + 1, top + 1, right - 1, bottom - 1));
    }
  }

  return { corners, buildings, craters: craters(rng, corners) };
}

// Inset one cell from its block, in cells [left, right) × [top, bottom).
function building(
  rng: () => number,
  left: number,
  top: number,
  right: number,
  bottom: number,
): Building {
  const rect = {
    x: left * CELL_SIZE,
    y: top * CELL_SIZE,
    w: (right - left) * CELL_SIZE,
    h: (bottom - top) * CELL_SIZE,
  };

  // Centered on a grid line inside the roof, so it never touches the parapet.
  const skylight =
    rng() < SKYLIGHT_CHANCE
      ? {
          x:
            rect.x +
            between(rng, 1, right - left - 1) * CELL_SIZE -
            SKYLIGHT_SIZE / 2,
          y:
            rect.y +
            between(rng, 1, bottom - top - 1) * CELL_SIZE -
            SKYLIGHT_SIZE / 2,
          w: SKYLIGHT_SIZE,
          h: SKYLIGHT_SIZE,
        }
      : null;

  // Hangs down one side wall from the parapet.
  const banner =
    rng() < BANNER_CHANCE
      ? {
          x: rng() < 0.5 ? rect.x : rect.x + rect.w - BANNER_WIDTH,
          y: rect.y,
          w: BANNER_WIDTH,
          h: between(rng, 2, 4) * BANNER_FOLD,
        }
      : null;

  return { ...rect, skylight, banner };
}

function pureAsphalt(corners: Terrain[][], row: number, column: number) {
  return (
    corners[row][column] === "asphalt" &&
    corners[row][column + 1] === "asphalt" &&
    corners[row + 1][column] === "asphalt" &&
    corners[row + 1][column + 1] === "asphalt"
  );
}

// The sprite is wider than a cell, so the whole ring of cells around it must be asphalt too:
// crater.png is made to blend into asphalt and would look pasted onto a plaza's curb.
// The top and bottom rows are skipped, since a crater there would be cut by the chunk's edge.
function craters(rng: () => number, corners: Terrain[][]): Vec[] {
  const found: Vec[] = [];

  for (let row = 1; row < ROWS - 1; row++)
    for (let column = 0; column < COLUMNS; column++) {
      let clear = true;
      for (let r = row - 1; r <= row + 1; r++)
        for (
          let c = Math.max(0, column - 1);
          c <= Math.min(COLUMNS - 1, column + 1);
          c++
        )
          if (!pureAsphalt(corners, r, c)) clear = false;

      if (clear && rng() < CRATER_CHANCE)
        found.push({
          x: (column + 0.5) * CELL_SIZE,
          y: (row + 0.5) * CELL_SIZE,
        });
    }
  return found;
}
