import { describe, expect, it } from "vitest";
import {
  CELL_SIZE,
  CHUNK_HEIGHT,
  CRATER_SIZE,
  MIN_BLOCK_CELLS,
} from "../config";
import type { TerrainDef } from "../types";
import {
  chunkLayout,
  COLUMNS,
  type ChunkLayout,
  ROWS,
  streetColumns,
  type Terrain,
} from "./layout";

// Mixed recipes push every rule: plaza, rubble, and open asphalt side by side.
const recipes: TerrainDef[] = Array.from({ length: 30 }, (_, i) => ({
  seed: 1000 + i * 7919,
  blocks: { plaza: 0.4, rubble: 0.4 },
}));
const CHUNKS = 8;

const everyChunk = (
  check: (layout: ChunkLayout, recipe: TerrainDef) => void,
) => {
  for (const recipe of recipes)
    for (let index = 0; index < CHUNKS; index++)
      check(chunkLayout(recipe, index), recipe);
};

const cellCorners = (corners: Terrain[][], row: number, column: number) => [
  corners[row][column],
  corners[row][column + 1],
  corners[row + 1][column],
  corners[row + 1][column + 1],
];

describe("chunkLayout", () => {
  it("gives the same chunk for the same seed", () => {
    const recipe = recipes[0];

    expect(chunkLayout(recipe, 3)).toEqual(chunkLayout(recipe, 3));
    expect(chunkLayout(recipe, 3)).not.toEqual(chunkLayout(recipe, 4));
  });

  it("joins consecutive chunks on their streets", () => {
    for (const recipe of recipes) {
      const columns = streetColumns(recipe.seed);

      for (let index = 0; index < CHUNKS; index++) {
        const lower = chunkLayout(recipe, index);
        const upper = chunkLayout(recipe, index + 1);

        // The upper chunk's bottom edge lies on the lower chunk's top edge.
        expect(upper.corners[ROWS]).toEqual(lower.corners[0]);
        for (const column of columns)
          for (const row of [lower.corners, upper.corners].flat())
            expect(row[column]).toBe("asphalt");
      }
    }
  });

  it("never mixes asphalt with two other terrains in one cell", () => {
    everyChunk(({ corners }) => {
      for (let row = 0; row < ROWS; row++)
        for (let column = 0; column < COLUMNS; column++) {
          const others = new Set(
            cellCorners(corners, row, column).filter((t) => t !== "asphalt"),
          );
          expect(others.size, `cell ${row},${column}`).toBeLessThanOrEqual(1);
        }
    });
  });

  it("keeps blocks at least MIN_BLOCK_CELLS wide", () => {
    for (const { seed } of recipes) {
      const edges = [-1, ...streetColumns(seed), COLUMNS];
      for (let i = 1; i < edges.length; i++)
        expect(edges[i] - edges[i - 1] - 1).toBeGreaterThanOrEqual(
          MIN_BLOCK_CELLS,
        );
    }
  });

  it("follows the recipe's shares", () => {
    const empty = chunkLayout({ seed: 5, blocks: { plaza: 0, rubble: 0 } }, 0);
    const full = chunkLayout({ seed: 5, blocks: { plaza: 1, rubble: 0 } }, 0);

    expect(empty.corners.flat().every((t) => t === "asphalt")).toBe(true);
    expect(empty.buildings).toHaveLength(0);
    expect(full.corners.flat()).toContain("plaza");
    expect(full.corners.flat()).not.toContain("rubble");
  });

  it("stands every building, skylight, and banner on its plaza", () => {
    everyChunk(({ corners, buildings }) => {
      for (const building of buildings) {
        const left = building.x / CELL_SIZE;
        const top = building.y / CELL_SIZE;
        const right = left + building.w / CELL_SIZE;
        const bottom = top + building.h / CELL_SIZE;

        for (let row = top; row <= bottom; row++)
          for (let column = left; column <= right; column++)
            expect(corners[row][column]).toBe("plaza");

        for (const part of [building.skylight, building.banner]) {
          if (!part) continue;
          expect(part.x).toBeGreaterThanOrEqual(building.x);
          expect(part.y).toBeGreaterThanOrEqual(building.y);
          expect(part.x + part.w).toBeLessThanOrEqual(building.x + building.w);
          expect(part.y + part.h).toBeLessThanOrEqual(building.y + building.h);
        }
      }
    });
  });

  it("keeps every crater's whole sprite on asphalt, inside its chunk", () => {
    const half = CRATER_SIZE / 2;
    let total = 0;

    everyChunk(({ corners, craters, buildings }) => {
      total += craters.length;

      for (const { x, y } of craters) {
        expect(y - half).toBeGreaterThanOrEqual(0);
        expect(y + half).toBeLessThanOrEqual(CHUNK_HEIGHT);

        // Every on-screen cell the sprite covers, even by a pixel.
        const top = Math.floor((y - half) / CELL_SIZE);
        const bottom = Math.ceil((y + half) / CELL_SIZE) - 1;
        const left = Math.max(0, Math.floor((x - half) / CELL_SIZE));
        const right = Math.min(
          COLUMNS - 1,
          Math.ceil((x + half) / CELL_SIZE) - 1,
        );
        for (let row = top; row <= bottom; row++)
          for (let column = left; column <= right; column++)
            expect(new Set(cellCorners(corners, row, column))).toEqual(
              new Set(["asphalt"]),
            );

        for (const building of buildings)
          expect(
            x + half > building.x &&
              x - half < building.x + building.w &&
              y + half > building.y &&
              y - half < building.y + building.h,
          ).toBe(false);
      }
    });

    expect(total).toBeGreaterThan(0);
  });

  it("never piles craters onto each other", () => {
    everyChunk(({ craters }) => {
      for (const [i, a] of craters.entries())
        for (const b of craters.slice(i + 1))
          expect(
            Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)),
          ).toBeGreaterThanOrEqual(CRATER_SIZE);
    });
  });
});
