import {
  BANNER_CHANCE,
  BUILDING_CHANCE,
  CANVAS_WIDTH,
  CELL_SIZE,
  CHUNK_HEIGHT,
  CRATER_CHANCE,
  FIXTURE_DENSITY,
  LAMP_CHANCE,
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

export interface Fixture extends Rect {
  kind: "vent" | "hatch" | "tank";
}

export interface Building extends Rect {
  skylight: Rect | null;
  banner: Rect | null;
  fixtures: Fixture[];
  // Blinks, so it is drawn every frame instead of baked into the chunk; `phase` keeps lamps out of step.
  lamp: (Vec & { phase: number }) | null;
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

// The roof's ink rim; everything on the roof keeps clear of it.
export const PARAPET = 2;
const ROOF_MARGIN = PARAPET + 2;
const SKYLIGHT_SIZE = 24;
const BANNER_WIDTH = 10;
// A banner hangs two to four folds long.
export const BANNER_FOLD = 8;
const SLOT = 16;
const FIXTURE_SIZES = {
  vent: { w: 6, h: 4 },
  hatch: { w: 8, h: 8 },
  tank: { w: 10, h: 10 },
} as const;

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

  // Hangs from the parapet, just inside one side wall.
  const banner =
    rng() < BANNER_CHANCE
      ? {
          x:
            rng() < 0.5
              ? rect.x + ROOF_MARGIN
              : rect.x + rect.w - ROOF_MARGIN - BANNER_WIDTH,
          y: rect.y + PARAPET,
          w: BANNER_WIDTH,
          h: between(rng, 2, 4) * BANNER_FOLD,
        }
      : null;

  // In a roof corner the banner and skylight leave free.
  const taken = [skylight, banner].filter((part): part is Rect => !!part);
  const corners = [
    { x: rect.x + ROOF_MARGIN, y: rect.y + ROOF_MARGIN },
    { x: rect.x + rect.w - ROOF_MARGIN - 2, y: rect.y + ROOF_MARGIN },
    { x: rect.x + ROOF_MARGIN, y: rect.y + rect.h - ROOF_MARGIN - 2 },
    {
      x: rect.x + rect.w - ROOF_MARGIN - 2,
      y: rect.y + rect.h - ROOF_MARGIN - 2,
    },
  ].filter(
    (corner) =>
      !taken.some((part) => overlaps({ ...corner, w: 2, h: 2 }, part)),
  );
  const lamp =
    corners.length > 0 && rng() < LAMP_CHANCE
      ? { ...corners[Math.floor(rng() * corners.length)], phase: rng() }
      : null;
  if (lamp) taken.push({ x: lamp.x, y: lamp.y, w: 2, h: 2 });

  return {
    ...rect,
    skylight,
    banner,
    fixtures: fixtures(rng, rect, taken),
    lamp,
  };
}

function overlaps(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
  );
}

// Each fixture is centered in its own free slot, so none touch each other or anything already on the roof.
function fixtures(rng: () => number, roof: Rect, taken: Rect[]): Fixture[] {
  const slots: Rect[] = [];
  for (
    let y = roof.y + ROOF_MARGIN;
    y + SLOT <= roof.y + roof.h - ROOF_MARGIN;
    y += SLOT
  )
    for (
      let x = roof.x + ROOF_MARGIN;
      x + SLOT <= roof.x + roof.w - ROOF_MARGIN;
      x += SLOT
    ) {
      const slot = { x, y, w: SLOT, h: SLOT };
      if (!taken.some((part) => overlaps(slot, part))) slots.push(slot);
    }

  const count = Math.max(1, Math.round(slots.length * FIXTURE_DENSITY));
  const found: Fixture[] = [];

  while (found.length < count && slots.length > 0) {
    const [slot] = slots.splice(Math.floor(rng() * slots.length), 1);
    const roll = rng();
    const kind = roll < 0.6 ? "vent" : roll < 0.85 ? "hatch" : "tank";
    const { w, h } = FIXTURE_SIZES[kind];
    found.push({
      kind,
      x: slot.x + (SLOT - w) / 2,
      y: slot.y + (SLOT - h) / 2,
      w,
      h,
    });
  }
  return found;
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
// The top and bottom rows are skipped, since a crater there would be cut by the chunk's edge,
// and no two craters are neighbors, so they never pile onto each other.
function craters(rng: () => number, corners: Terrain[][]): Vec[] {
  const found: Vec[] = [];
  const near = (row: number, column: number) =>
    found.some(
      (crater) =>
        Math.abs(Math.floor(crater.y / CELL_SIZE) - row) <= 1 &&
        Math.abs(Math.floor(crater.x / CELL_SIZE) - column) <= 1,
    );

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

      if (clear && !near(row, column) && rng() < CRATER_CHANCE)
        found.push({
          x: (column + 0.5) * CELL_SIZE,
          y: (row + 0.5) * CELL_SIZE,
        });
    }
  return found;
}
