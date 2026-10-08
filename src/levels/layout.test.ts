import { describe, expect, it } from "vitest";
import {
  CELL_SIZE,
  CHUNK_HEIGHT,
  CRATER_SIZE,
  MIN_BLOCK_CELLS,
} from "../config";
import type { AnchorKind, TerrainDef } from "../types";
import {
  anchorNear,
  chunkLayout,
  COLUMNS,
  type ChunkLayout,
  PARAPET,
  type Rect,
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

  it("keeps roof fixtures and lamps clear of the parapet and of each other", () => {
    let fixtures = 0;
    let lamps = 0;

    everyChunk(({ buildings }) => {
      for (const building of buildings) {
        const parts = [
          building.skylight,
          building.banner,
          building.lamp && {
            x: building.lamp.x,
            y: building.lamp.y,
            w: 2,
            h: 2,
          },
          ...building.fixtures,
        ].filter((part) => part !== null);
        fixtures += building.fixtures.length;
        if (building.lamp) lamps++;

        for (const part of parts) {
          expect(part.x).toBeGreaterThanOrEqual(building.x + PARAPET);
          expect(part.y).toBeGreaterThanOrEqual(building.y + PARAPET);
          expect(part.x + part.w).toBeLessThanOrEqual(
            building.x + building.w - PARAPET,
          );
          expect(part.y + part.h).toBeLessThanOrEqual(
            building.y + building.h - PARAPET,
          );
        }

        for (const [i, a] of parts.entries())
          for (const b of parts.slice(i + 1))
            expect(
              a.x < b.x + b.w &&
                b.x < a.x + a.w &&
                a.y < b.y + b.h &&
                b.y < a.y + a.h,
            ).toBe(false);
      }
    });

    expect(fixtures).toBeGreaterThan(0);
    expect(lamps).toBeGreaterThan(0);
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

describe("anchors", () => {
  const kinds: AnchorKind[] = ["street", "plaza", "rooftop", "skylight"];

  const inside = (x: number, y: number, rect: Rect) =>
    x > rect.x && x < rect.x + rect.w && y > rect.y && y < rect.y + rect.h;

  it("stands every anchor on its own ground", () => {
    const seen = new Set<AnchorKind>();

    everyChunk(({ corners, buildings, craters, anchors }) => {
      const roofed = (x: number, y: number) =>
        buildings.some((building) => inside(x, y, building));

      for (const { kind, x, y } of anchors) {
        seen.add(kind);
        const row = Math.floor(y / CELL_SIZE);
        const column = Math.floor(x / CELL_SIZE);

        if (kind === "street") {
          expect(new Set(cellCorners(corners, row, column))).toEqual(
            new Set(["asphalt"]),
          );
          expect(craters).not.toContainEqual({ x, y });
        } else if (kind === "plaza") {
          expect(cellCorners(corners, row, column)).toEqual(
            Array(4).fill("plaza"),
          );
          expect(roofed(x, y)).toBe(false);
        } else if (kind === "rooftop") {
          expect(roofed(x, y)).toBe(true);
        } else {
          const skylights = buildings.flatMap((b) => b.skylight ?? []);
          expect(skylights.some((s) => inside(x, y, s))).toBe(true);
        }
      }
    });

    expect([...seen].sort()).toEqual([...kinds].sort());
  });

  it("gives every roof and skylight an anchor", () => {
    everyChunk(({ buildings, anchors }) => {
      const count = (kind: AnchorKind) =>
        anchors.filter((anchor) => anchor.kind === kind).length;

      expect(count("rooftop")).toBe(buildings.length);
      expect(count("skylight")).toBe(
        buildings.filter((building) => building.skylight).length,
      );
    });
  });
});

describe("anchorNear", () => {
  const recipe = recipes[0];

  // Every anchor of a kind in level space, from far more chunks than anchorNear looks at.
  const allAnchors = (kind: AnchorKind) =>
    Array.from({ length: CHUNKS + 4 }, (_, i) => i - 2).flatMap((index) =>
      chunkLayout(recipe, index)
        .anchors.filter((anchor) => anchor.kind === kind)
        .map(({ x, y }) => ({ x, y: (index + 1) * CHUNK_HEIGHT - y })),
    );

  it("finds the nearest anchor of the kind, in level space", () => {
    for (const kind of ["street", "plaza", "rooftop"] as const) {
      const all = allAnchors(kind);

      for (let at = 0; at < CHUNK_HEIGHT * CHUNKS; at += 97) {
        const anchor = anchorNear(recipe, kind, at);
        const nearest = Math.min(...all.map(({ y }) => Math.abs(y - at)));

        expect(all).toContainEqual(anchor);
        expect(Math.abs(anchor.y - at)).toBe(nearest);
      }
    }
  });

  it("breaks a tie toward the middle of the screen", () => {
    const at = CHUNK_HEIGHT * 2 - CELL_SIZE / 2;
    const row = allAnchors("street").filter(({ y }) => y === at);
    const middle = Math.min(...row.map(({ x }) => Math.abs(x - 240)));

    expect(row.length).toBeGreaterThan(1);
    expect(Math.abs(anchorNear(recipe, "street", at).x - 240)).toBe(middle);
  });

  it("fails loudly when the recipe has no such ground", () => {
    const open = { seed: 5, blocks: { plaza: 0, rubble: 0 } };

    expect(() => anchorNear(open, "rooftop", 500)).toThrow(/rooftop/);
  });
});
