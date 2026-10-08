import { describe, expect, it } from "vitest";
import { CANVAS_HEIGHT, CHUNK_HEIGHT } from "../config";
import type { TilesetDef } from "../types";
import { cellTile, tileKey, visibleChunks } from "./Background";
import { chunkLayout, COLUMNS, ROWS, type Terrain } from "./layout";

// Vite can read public/ at test time; the game loads these through assets.ts.
const tilesets = import.meta.glob<TilesetDef>(
  "/public/assets/sprites/*-tileset.json",
  { eager: true, import: "default" },
);
const keysOf = (name: string) =>
  new Set(
    tilesets[`/public/assets/sprites/${name}.json`].tiles.map((tile) =>
      tileKey(tile.corners),
    ),
  );

describe("visibleChunks", () => {
  it("covers the whole screen at every scroll, with at most two chunks", () => {
    for (let scroll = 0; scroll < CHUNK_HEIGHT * 3; scroll += 7) {
      const chunks = visibleChunks(scroll);
      const top = chunks[chunks.length - 1].y;
      const bottom = chunks[0].y + CHUNK_HEIGHT;

      expect(chunks.length).toBeLessThanOrEqual(2);
      expect(top).toBeLessThanOrEqual(0);
      expect(bottom).toBeGreaterThanOrEqual(CANVAS_HEIGHT);
    }
  });

  it("stacks consecutive chunks edge to edge, the later one above", () => {
    const [lower, upper] = visibleChunks(CHUNK_HEIGHT + 100);

    expect(upper.index).toBe(lower.index + 1);
    expect(upper.y + CHUNK_HEIGHT).toBe(lower.y);
  });

  it("moves the city down one pixel per pixel of scroll", () => {
    const before = visibleChunks(500)[0];
    const after = visibleChunks(501)[0];

    expect(after.index).toBe(before.index);
    expect(after.y - before.y).toBe(1);
  });
});

describe("cellTile", () => {
  it("finds a tile in its sheet for every cell of a mixed city", () => {
    const sheets = {
      "ground-tileset": keysOf("ground-tileset"),
      "rubble-tileset": keysOf("rubble-tileset"),
    };

    for (let seed = 0; seed < 20; seed++)
      for (let index = -1; index < 6; index++) {
        const { corners } = chunkLayout(
          { seed, blocks: { plaza: 0.4, rubble: 0.4 } },
          index,
        );
        for (let row = 0; row < ROWS; row++)
          for (let column = 0; column < COLUMNS; column++) {
            const { tileset, key } = cellTile(corners, row, column);
            expect(sheets[tileset].has(key), `${tileset} ${key}`).toBe(true);
          }
      }
  });

  it("uses the rubble sheet for rubble, and the ground sheet otherwise", () => {
    const cell = (other: Terrain) =>
      cellTile(
        [
          ["asphalt", other],
          ["asphalt", "asphalt"],
        ],
        0,
        0,
      );

    expect(cell("rubble")).toEqual({
      tileset: "rubble-tileset",
      key: "lower,upper,lower,lower",
    });
    expect(cell("plaza")).toEqual({
      tileset: "ground-tileset",
      key: "lower,upper,lower,lower",
    });
    expect(cell("asphalt")).toEqual({
      tileset: "ground-tileset",
      key: "lower,lower,lower,lower",
    });
  });
});
