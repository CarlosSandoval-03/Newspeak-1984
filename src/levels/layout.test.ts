import { describe, expect, it } from "vitest";
import {
  AIRFIELD_AT,
  BRIDGE_SIZE,
  TRACK_SIZE,
  CANVAS_WIDTH,
  CELL_SIZE,
  CHUNK_HEIGHT,
  CRATER_SIZE,
  GROUND_SLOGAN_SIZE,
  LANDING_LEAD,
  LANDMARK_SIZE,
  MIN_BLOCK_CELLS,
  MURAL_SIZE,
  PLATFORM_SIZE,
  TELESCREEN_SIZE,
} from "../config";
import type { AnchorKind } from "../types";
import {
  anchorNear,
  chunkLayout,
  type City,
  COLUMNS,
  type ChunkLayout,
  landmarkPlaza,
  middleStreets,
  railwayMiddle,
  PARAPET,
  type Rect,
  RIVER_ROWS,
  ROWS,
  streetColumns,
  type Terrain,
} from "./layout";

// Long enough that the landing platform lies far past every chunk checked.
const LENGTH = 100_000;
// Mixed recipes push every rule: plaza, rubble, open asphalt, a river, and a railway side by side.
const RIVER_AT = CHUNK_HEIGHT * 3.5;
const RAILWAY = { from: CHUNK_HEIGHT * 5.3, to: CHUNK_HEIGHT * 6.6 };
const recipes: City[] = Array.from({ length: 30 }, (_, i) => ({
  terrain: {
    seed: 1000 + i * 7919,
    blocks: { plaza: 0.4, rubble: 0.4 },
    river: { at: RIVER_AT, bridges: 2 },
    railway: RAILWAY,
  },
  length: LENGTH,
}));
const CHUNKS = 8;
const plazas = (share: number): City => ({
  terrain: { seed: 5, blocks: { plaza: share, rubble: 0 } },
  length: LENGTH,
});

const touches = (a: Rect, b: Rect) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

const everyChunk = (check: (layout: ChunkLayout, recipe: City) => void) => {
  for (const recipe of recipes)
    for (let index = 0; index < CHUNKS; index++)
      check(chunkLayout(recipe, index), recipe);
};

// The ground a painted slogan covers, centered on its anchor.
const sloganBox = ({ x, y }: { x: number; y: number }): Rect => ({
  x: x - GROUND_SLOGAN_SIZE.w / 2,
  y: y - GROUND_SLOGAN_SIZE.h / 2,
  ...GROUND_SLOGAN_SIZE,
});

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
      const columns = streetColumns(recipe.terrain.seed);

      for (let index = 0; index < CHUNKS; index++) {
        const lower = chunkLayout(recipe, index);
        const upper = chunkLayout(recipe, index + 1);

        // The upper chunk's bottom edge lies on the lower chunk's top edge, and the vertical streets
        // run unbroken but across the river, where bridges carry them.
        expect(upper.corners[ROWS]).toEqual(lower.corners[0]);
        for (const column of columns)
          for (const row of [lower.corners, upper.corners].flat())
            if (!row.every((terrain) => terrain === "water"))
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
    for (const {
      terrain: { seed },
    } of recipes) {
      const edges = [-1, ...streetColumns(seed), COLUMNS];
      for (let i = 1; i < edges.length; i++)
        expect(edges[i] - edges[i - 1] - 1).toBeGreaterThanOrEqual(
          MIN_BLOCK_CELLS,
        );
    }
  });

  it("follows the recipe's shares", () => {
    const empty = chunkLayout(plazas(0), 0);
    const full = chunkLayout(plazas(1), 0);

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

describe("the river", () => {
  // The corner rows that are water all the way across.
  const waterRows = (corners: Terrain[][]) =>
    corners.flatMap((row, i) => (row.every((t) => t === "water") ? [i] : []));

  it("runs as a band of water across its chunk alone, between two bank streets", () => {
    for (const at of [RIVER_AT, CHUNK_HEIGHT * 3 + 10, CHUNK_HEIGHT * 4 - 10])
      for (const recipe of recipes) {
        const city = {
          ...recipe,
          terrain: { ...recipe.terrain, river: { at, bridges: 2 } },
        };
        const index = Math.floor(at / CHUNK_HEIGHT);
        const { corners, buildings } = chunkLayout(city, index);
        const water = waterRows(corners);
        const top = water[0] - 1;

        // Water on the band's inner corners only, nowhere else.
        expect(water).toEqual(
          Array.from({ length: RIVER_ROWS - 1 }, (_, i) => top + 1 + i),
        );
        expect(corners.flat().filter((t) => t === "water").length).toBe(
          water.length * (COLUMNS + 1),
        );
        // A bank street on each side, and a whole block between it and the chunk's edge.
        for (const row of [
          top - 1,
          top,
          top + RIVER_ROWS,
          top + RIVER_ROWS + 1,
        ])
          expect(new Set(corners[row])).toEqual(new Set(["asphalt"]));
        expect(top - 1).toBeGreaterThanOrEqual(1 + MIN_BLOCK_CELLS);
        expect(top + RIVER_ROWS).toBeLessThanOrEqual(
          ROWS - 1 - MIN_BLOCK_CELLS,
        );
        const banks = {
          x: 0,
          y: (top - 1) * CELL_SIZE,
          w: CANVAS_WIDTH,
          h: (RIVER_ROWS + 2) * CELL_SIZE,
        };
        expect(buildings.some((building) => touches(building, banks))).toBe(
          false,
        );

        for (const other of [index - 1, index + 1])
          expect(waterRows(chunkLayout(city, other).corners)).toEqual([]);
      }
  });

  it("is centered on the row nearest its distance when the chunk has room", () => {
    for (const recipe of recipes) {
      const { corners } = chunkLayout(
        recipe,
        Math.floor(RIVER_AT / CHUNK_HEIGHT),
      );
      const middle = (waterRows(corners)[0] - 1 + RIVER_ROWS / 2) * CELL_SIZE;

      expect(
        Math.abs(
          Math.ceil(RIVER_AT / CHUNK_HEIGHT) * CHUNK_HEIGHT - middle - RIVER_AT,
        ),
      ).toBeLessThanOrEqual(CELL_SIZE);
    }
  });

  it("carries the vertical streets nearest the middle over it, and only those", () => {
    for (const recipe of recipes) {
      const { corners, bridges } = chunkLayout(
        recipe,
        Math.floor(RIVER_AT / CHUNK_HEIGHT),
      );
      const top = waterRows(corners)[0] - 1;
      const streets = middleStreets(recipe.terrain.seed);

      expect(bridges).toEqual(
        streets.slice(0, 2).map((x) => ({
          x: x - BRIDGE_SIZE.w / 2,
          y: top * CELL_SIZE,
          ...BRIDGE_SIZE,
        })),
      );
    }
    everyChunk(({ bridges, corners }) => {
      if (waterRows(corners).length === 0) expect(bridges).toEqual([]);
    });
  });
});

describe("the railway", () => {
  const reached = [5, 6];
  const columnsOf = (seed: number) => {
    const right = railwayMiddle(seed) / CELL_SIZE;
    return [right - 1, right];
  };

  it("widens the street nearest the middle into two columns, taking one from the wider block", () => {
    for (const { terrain } of recipes) {
      const columns = columnsOf(terrain.seed);
      const streets = streetColumns(terrain.seed);
      const [street] = middleStreets(terrain.seed).map(
        (x) => x / CELL_SIZE - 0.5,
      );
      const i = streets.indexOf(street);
      const left = street - (i > 0 ? streets[i - 1] + 1 : 0);
      const right = (streets[i + 1] ?? COLUMNS) - street - 1;

      expect(columns).toContain(street);
      expect(columns).toContain(right >= left ? street + 1 : street - 1);
      for (const index of reached) {
        const { corners } = chunkLayout({ terrain, length: LENGTH }, index);
        for (let row = 0; row < ROWS; row++)
          for (const column of columns)
            expect(cellCorners(corners, row, column)).toEqual(
              Array(4).fill("asphalt"),
            );
      }
    }
  });

  it("lays its track down the middle, on every row between its two distances", () => {
    for (const recipe of recipes) {
      const distances: number[] = [];
      for (let index = 0; index < CHUNKS; index++)
        for (const track of chunkLayout(recipe, index).tracks) {
          expect(track.x + track.w / 2).toBe(
            railwayMiddle(recipe.terrain.seed),
          );
          expect(track.h).toBe(TRACK_SIZE.h);
          distances.push((index + 1) * CHUNK_HEIGHT - (track.y + track.h / 2));
        }

      const rows = [];
      for (let at = CELL_SIZE / 2; at < CHUNKS * CHUNK_HEIGHT; at += CELL_SIZE)
        if (at >= RAILWAY.from && at <= RAILWAY.to) rows.push(at);
      expect(distances.sort((a, b) => a - b)).toEqual(rows);
    }
  });

  it("keeps craters and other anchors off its columns", () => {
    for (const recipe of recipes) {
      const columns = columnsOf(recipe.terrain.seed);
      for (const index of reached) {
        const { craters, anchors } = chunkLayout(recipe, index);
        const onIt = ({ x }: { x: number }) =>
          columns.includes(Math.floor(x / CELL_SIZE));

        expect(craters.filter(onIt)).toEqual([]);
        expect(anchors.filter((a) => a.kind === "street" && onIt(a))).toEqual(
          [],
        );
      }
    }
  });
});

describe("anchors", () => {
  const kinds: AnchorKind[] = [
    "street",
    "plaza",
    "rooftop",
    "skylight",
    "bridge",
    "railway",
    "mural",
    "telescreen",
    "slogan",
  ];

  const inside = (x: number, y: number, rect: Rect) =>
    x > rect.x && x < rect.x + rect.w && y > rect.y && y < rect.y + rect.h;

  it("stands every anchor on its own ground", () => {
    const seen = new Set<AnchorKind>();

    everyChunk(({ corners, buildings, craters, anchors, bridges, tracks }) => {
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
        } else if (kind === "slogan") {
          // All of it on whole plaza cells: inside the curb, under no roof.
          const box = sloganBox({ x, y });
          for (let r = box.y / CELL_SIZE; r < (box.y + box.h) / CELL_SIZE; r++)
            for (
              let c = box.x / CELL_SIZE;
              c < (box.x + box.w) / CELL_SIZE;
              c++
            )
              expect(
                cellCorners(corners, Math.floor(r), Math.floor(c)),
              ).toEqual(Array(4).fill("plaza"));
          expect(buildings.some((building) => touches(building, box))).toBe(
            false,
          );
        } else if (kind === "rooftop") {
          expect(roofed(x, y)).toBe(true);
        } else if (kind === "mural" || kind === "telescreen") {
          // The middle of a roof with room for the whole of it, and no skylight under it.
          const size = kind === "mural" ? MURAL_SIZE : TELESCREEN_SIZE;
          const roof = buildings.find((building) => inside(x, y, building));
          expect(roof?.skylight).toBeNull();
          expect(roof!.w - 2 * PARAPET).toBeGreaterThanOrEqual(size.w);
          expect(roof!.h - 2 * PARAPET).toBeGreaterThanOrEqual(size.h);
          expect({ x, y }).toEqual({
            x: roof!.x + roof!.w / 2,
            y: roof!.y + roof!.h / 2,
          });
        } else if (kind === "railway") {
          expect(
            tracks.map((t) => ({ x: t.x + t.w / 2, y: t.y + t.h / 2 })),
          ).toContainEqual({ x, y });
        } else if (kind === "bridge") {
          expect(
            bridges.map((b) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 })),
          ).toContainEqual({ x, y });
        } else {
          const skylights = buildings.flatMap((b) => b.skylight ?? []);
          expect(skylights.some((s) => inside(x, y, s))).toBe(true);
        }
      }
    });

    expect([...seen].sort()).toEqual([...kinds].sort());
  });

  it("lays a platform at the start and past the length, each on open ground", () => {
    for (const recipe of [...recipes, plazas(1)])
      for (const [eye, landing] of [
        [AIRFIELD_AT, false],
        [recipe.length + LANDING_LEAD, true],
      ] as const) {
        const index = Math.floor(eye / CHUNK_HEIGHT);
        const { airfields, buildings, anchors } = chunkLayout(recipe, index);
        const [airfield] = airfields;

        expect(airfields).toHaveLength(1);
        expect(airfield.landing).toBe(landing);
        expect(airfield.x + airfield.w / 2).toBe(CANVAS_WIDTH / 2);
        expect((index + 1) * CHUNK_HEIGHT - (airfield.y + airfield.h / 2)).toBe(
          eye,
        );
        expect({ w: airfield.w, h: airfield.h }).toEqual(PLATFORM_SIZE);
        expect(buildings.some((building) => touches(building, airfield))).toBe(
          false,
        );
        expect(
          anchors.some((anchor) =>
            touches({ ...anchor, w: 0, h: 0 }, airfield),
          ),
        ).toBe(false);
      }
    everyChunk(({ airfields }) => expect(airfields).toEqual([]));
  });

  it("lays the ministry centered at its distance, on an open plaza nothing stands on", () => {
    const at = CHUNK_HEIGHT * 2.5;
    for (const ministry of ["truth", "plenty", "peace", "love"] as const) {
      const city: City = {
        ...recipes[0],
        terrain: { ...recipes[0].terrain, landmark: { at, ministry } },
      };
      const index = Math.floor(at / CHUNK_HEIGHT);
      const { landmarks, buildings, anchors } = chunkLayout(city, index);
      const [landmark] = landmarks;
      const plaza = landmarkPlaza(landmark);

      expect(landmarks).toHaveLength(1);
      expect(landmark.ministry).toBe(ministry);
      expect(landmark.x + landmark.w / 2).toBe(CANVAS_WIDTH / 2);
      expect((index + 1) * CHUNK_HEIGHT - (landmark.y + landmark.h / 2)).toBe(
        at,
      );
      expect(landmark.w).toBe(LANDMARK_SIZE);
      expect(buildings.some((building) => touches(building, plaza))).toBe(
        false,
      );
      expect(
        anchors.some((anchor) => touches({ ...anchor, w: 0, h: 0 }, plaza)),
      ).toBe(false);
      expect(
        anchors.some(
          (anchor) =>
            anchor.kind === "slogan" && touches(sloganBox(anchor), plaza),
        ),
      ).toBe(false);
      expect(chunkLayout(city, index + 2).landmarks).toEqual([]);
    }
    everyChunk(({ landmarks }) => expect(landmarks).toEqual([]));
  });

  it("lays a ministry across a chunk edge in both chunks it reaches", () => {
    const city: City = {
      ...recipes[0],
      terrain: {
        ...recipes[0].terrain,
        landmark: { at: CHUNK_HEIGHT * 2, ministry: "love" },
      },
    };

    expect(chunkLayout(city, 1).landmarks).toHaveLength(1);
    expect(chunkLayout(city, 2).landmarks).toHaveLength(1);
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

  // Every anchor of a kind in level space, from every chunk anchorNear can reach: four either side.
  const allAnchors = (kind: AnchorKind) =>
    Array.from({ length: CHUNKS + 8 }, (_, i) => i - 4).flatMap((index) =>
      chunkLayout(recipe, index)
        .anchors.filter((anchor) => anchor.kind === kind)
        .map(({ x, y }) => ({ x, y: (index + 1) * CHUNK_HEIGHT - y })),
    );

  it("finds the anchor of the kind nearest to (x, at), in level space", () => {
    for (const kind of ["street", "plaza", "rooftop"] as const) {
      const all = allAnchors(kind);

      for (let at = 0; at < CHUNK_HEIGHT * CHUNKS; at += 97)
        for (const x of [0, 240, 480]) {
          const anchor = anchorNear(recipe, kind, at, x);
          const distance = (a: { x: number; y: number }) =>
            Math.hypot(a.x - x, a.y - at);
          const nearest = Math.min(...all.map(distance));

          expect(all).toContainEqual(anchor);
          expect(distance(anchor)).toBeCloseTo(nearest);
        }
    }
  });

  it("looks around the middle of the screen when no x is given", () => {
    expect(anchorNear(recipe, "street", 1500)).toEqual(
      anchorNear(recipe, "street", 1500, 240),
    );
  });

  it("lets x pick a side of the screen", () => {
    const left = anchorNear(recipe, "street", 1500, 0);
    const right = anchorNear(recipe, "street", 1500, 480);

    expect(left.x).toBeLessThan(right.x);
  });

  it("fails loudly when the recipe has no such ground", () => {
    expect(() => anchorNear(plazas(0), "rooftop", 500)).toThrow(/rooftop/);
  });
});
