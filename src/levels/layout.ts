import {
  AIRFIELD_AT,
  BANNER_CHANCE,
  BRIDGE_SIZE,
  BUILDING_CHANCE,
  CANVAS_WIDTH,
  CELL_SIZE,
  CHUNK_HEIGHT,
  CRATER_CHANCE,
  FIXTURE_DENSITY,
  GROUND_SLOGAN_SIZE,
  LAMP_CHANCE,
  LANDING_LEAD,
  LANDMARK_MARGIN,
  LANDMARK_SIZE,
  MAX_BLOCK_CELLS,
  MIN_BLOCK_CELLS,
  MURAL_SIZE,
  PLATFORM_SIZE,
  SKYLIGHT_CHANCE,
  TELESCREEN_SIZE,
} from "../config";
import { clamp } from "../core/math";
import type { AnchorKind, LevelDef, Ministry, TerrainDef, Vec } from "../types";

// What the city needs from a level: its recipe, and where it ends, for the landing platform.
export type City = Pick<LevelDef, "terrain" | "length">;

export type Terrain = "asphalt" | "plaza" | "rubble" | "water";

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

// A landing platform's lamps chase toward the plane coming in, a start platform's away with it.
export interface Airfield extends Rect {
  landing: boolean;
}

// The sprite's square; the plaza around it reaches LANDMARK_MARGIN further on every side.
export interface Landmark extends Rect {
  ministry: Ministry;
}

export interface Anchor extends Vec {
  kind: AnchorKind;
}

// Positions are in chunk pixels, with y = 0 at the chunk's top edge.
export interface ChunkLayout {
  // Terrain on tile corners: (ROWS + 1) × (COLUMNS + 1), indexed [row][column].
  corners: Terrain[][];
  buildings: Building[];
  craters: Vec[];
  anchors: Anchor[];
  // Over the river, baked into the chunk like the craters.
  bridges: Rect[];
  // Launch platforms and the level's ministry, which may run past the chunk's edges.
  airfields: Airfield[];
  landmarks: Landmark[];
}

export const COLUMNS = CANVAS_WIDTH / CELL_SIZE;
export const ROWS = CHUNK_HEIGHT / CELL_SIZE;
// Cell rows of water: the river is as tall as a bridge is long.
export const RIVER_ROWS = BRIDGE_SIZE.h / CELL_SIZE;

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

// The middle of each vertical street, nearest the middle of the screen first: where the player
// flies, so where bridges cross and the land battleship rides.
export function middleStreets(seed: number): number[] {
  const middle = CANVAS_WIDTH / 2;
  return streetColumns(seed)
    .map((column) => (column + 0.5) * CELL_SIZE)
    .sort((a, b) => Math.abs(a - middle) - Math.abs(b - middle));
}

// The cell spans between streets, as [first, end) pairs; streets side by side, like a river's
// band, leave none between them.
function spans(streetCells: number[], first: number, length: number) {
  const edges = [first - 1, ...streetCells, length];
  return edges
    .slice(1)
    .map((end, i) => [edges[i] + 1, end] as const)
    .filter(([start, end]) => end > start);
}

// A chunk of the city, built in rule order from its own seed: the streets (around the river, if it
// runs here), the blocks between them (open plaza under any airfield or ministry), the river's
// water, the craters on open asphalt, and the anchors ground elements stand on. The order of the
// random draws is part of the map: changing it changes every city.
export function chunkLayout(city: City, index: number): ChunkLayout {
  const { terrain } = city;
  const rng = random(terrain.seed + index);
  const airfields = chunkAirfields(city, index);
  const landmarks = chunkLandmarks(terrain, index);
  const river = chunkRiver(terrain, index);
  // Ground nothing may build on or stand on.
  const cleared = [...airfields, ...landmarks.map(landmarkPlaza)];

  // Row 0 is always a street, and every block stays clear of the bottom edge's corners,
  // so chunks join on asphalt whatever their neighbors hold.
  const streetCells = {
    rows: [0, ...streetRows(rng, river)],
    columns: streetColumns(terrain.seed),
  };

  const { corners, buildings, plazas } = blocks(
    rng,
    terrain,
    streetCells,
    cleared,
  );
  if (river) flood(corners, river);
  const found = craters(rng, corners);
  const bridges = river?.bridges ?? [];

  return {
    corners,
    buildings,
    craters: found,
    // Nothing stands on the water but on a bridge, nor on a runway or a ministry.
    anchors: [
      ...anchors(streetCells, plazas, buildings, found).filter(
        (anchor) => !wet(corners, anchor),
      ),
      ...bridges.map(({ x, y, w, h }) => ({
        kind: "bridge" as const,
        x: x + w / 2,
        y: y + h / 2,
      })),
    ].filter((anchor) => !cleared.some((rect) => inside(anchor, rect))),
    bridges,
    airfields,
    landmarks,
  };
}

// The river's band in the chunk it runs through: its first cell row, and the bridges over it.
interface River {
  top: number;
  bridges: Rect[];
}

// Centered on the cell row nearest the river's distance, but kept inside the chunk with room for a
// whole block between each bank street and the chunk's edges, so a river never spans two chunks.
// The vertical streets nearest the middle cross it on bridges.
function chunkRiver(terrain: TerrainDef, index: number): River | null {
  const { river, seed } = terrain;
  if (!river || Math.floor(river.at / CHUNK_HEIGHT) !== index) return null;

  const middle = Math.floor(
    ((index + 1) * CHUNK_HEIGHT - river.at) / CELL_SIZE,
  );
  const top = clamp(
    middle - Math.floor(RIVER_ROWS / 2),
    MIN_BLOCK_CELLS + 2,
    ROWS - 1 - MIN_BLOCK_CELLS - RIVER_ROWS,
  );
  const bridges = middleStreets(seed)
    .slice(0, river.bridges)
    .map((x) => ({
      x: x - BRIDGE_SIZE.w / 2,
      y: top * CELL_SIZE,
      ...BRIDGE_SIZE,
    }));
  return { top, bridges };
}

// The horizontal streets after row 0. Around a river, a street runs along each bank, and the band
// between them counts as street rows too, so no block reaches the water.
function streetRows(rng: () => number, river: River | null): number[] {
  if (!river) return streets(rng, 1, ROWS);

  const bankAbove = river.top - 1;
  const bankBelow = river.top + RIVER_ROWS;
  return [
    ...streets(rng, 1, bankAbove),
    ...Array.from({ length: RIVER_ROWS + 2 }, (_, i) => bankAbove + i),
    ...streets(rng, bankBelow + 1, ROWS),
  ];
}

// Water on the corners inside the band, so its first and last cell rows are the embankment.
function flood(corners: Terrain[][], { top }: River): void {
  for (let row = top + 1; row < top + RIVER_ROWS; row++)
    corners[row].fill("water");
}

function wet(corners: Terrain[][], { x, y }: Vec): boolean {
  const row = Math.floor(y / CELL_SIZE);
  const column = Math.floor(x / CELL_SIZE);
  return [
    corners[row][column],
    corners[row][column + 1],
    corners[row + 1][column],
    corners[row + 1][column + 1],
  ].includes("water");
}

// The start and landing platforms that reach into this chunk, if any.
function chunkAirfields(city: City, index: number): Airfield[] {
  return [
    airfield(index, AIRFIELD_AT, false),
    airfield(index, city.length + LANDING_LEAD, true),
  ].filter((rect) => rect.y < CHUNK_HEIGHT && rect.y + rect.h > 0);
}

// The level's ministry, if it reaches into this chunk.
function chunkLandmarks(terrain: TerrainDef, index: number): Landmark[] {
  if (!terrain.landmark) return [];

  const { at, ministry } = terrain.landmark;
  const center = (index + 1) * CHUNK_HEIGHT - at;
  const landmark = {
    x: (CANVAS_WIDTH - LANDMARK_SIZE) / 2,
    y: center - LANDMARK_SIZE / 2,
    w: LANDMARK_SIZE,
    h: LANDMARK_SIZE,
    ministry,
  };
  const plaza = landmarkPlaza(landmark);
  return plaza.y < CHUNK_HEIGHT && plaza.y + plaza.h > 0 ? [landmark] : [];
}

export function landmarkPlaza({ x, y, w, h }: Rect): Rect {
  return {
    x: x - LANDMARK_MARGIN,
    y: y - LANDMARK_MARGIN,
    w: w + 2 * LANDMARK_MARGIN,
    h: h + 2 * LANDMARK_MARGIN,
  };
}

// An open plaza block. One under a runway or a ministry is kept bare, so nothing is painted on it.
interface Plaza extends Rect {
  bare: boolean;
}

// Cells [left, right) × [top, bottom).
interface Block {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

// Each block between the streets becomes plaza, rubble, or open asphalt by the recipe's shares, and
// most plazas get a building; the rest stay open, for ground elements to stand on. A block under
// cleared ground is an open plaza, so no roof rises through a runway or a ministry.
function blocks(
  rng: () => number,
  terrain: TerrainDef,
  streetCells: { rows: number[]; columns: number[] },
  cleared: Rect[],
) {
  const corners: Terrain[][] = Array.from({ length: ROWS + 1 }, () =>
    Array<Terrain>(COLUMNS + 1).fill("asphalt"),
  );
  const buildings: Building[] = [];
  const plazas: Plaza[] = [];

  for (const [top, bottom] of spans(streetCells.rows.slice(1), 1, ROWS))
    for (const [left, right] of spans(streetCells.columns, 0, COLUMNS)) {
      const block = { left, top, right, bottom };
      const roll = rng();
      const open = cleared.some((rect) => overlaps(blockRect(block), rect));
      const kind = open ? "plaza" : blockKind(roll, terrain.blocks);
      if (kind === "asphalt") continue;

      paintBlock(corners, block, kind);
      if (kind !== "plaza") continue;

      if (!open && rng() < BUILDING_CHANCE)
        buildings.push(building(rng, inset(block)));
      else plazas.push({ ...blockRect(block), bare: open });
    }

  return { corners, buildings, plazas };
}

function blockKind(roll: number, shares: TerrainDef["blocks"]): Terrain {
  if (roll < shares.plaza) return "plaza";
  if (roll < shares.plaza + shares.rubble) return "rubble";
  return "asphalt";
}

// Inner corners only, so each block's edge cells hold its curb and the streets stay pure asphalt.
// A block at the screen's side runs off it, with no curb there.
function paintBlock(corners: Terrain[][], block: Block, kind: Terrain): void {
  const first = block.left === 0 ? 0 : block.left + 1;
  const last = block.right === COLUMNS ? COLUMNS : block.right - 1;

  for (let row = block.top + 1; row <= block.bottom - 1; row++)
    for (let column = first; column <= last; column++)
      corners[row][column] = kind;
}

const inset = ({ left, top, right, bottom }: Block): Block => ({
  left: left + 1,
  top: top + 1,
  right: right - 1,
  bottom: bottom - 1,
});

const blockRect = ({ left, top, right, bottom }: Block): Rect => ({
  x: left * CELL_SIZE,
  y: top * CELL_SIZE,
  w: (right - left) * CELL_SIZE,
  h: (bottom - top) * CELL_SIZE,
});

// Centered across the screen, with its eye at level distance `at`, in the chunk's pixels.
function airfield(index: number, at: number, landing: boolean): Airfield {
  const { w, h } = PLATFORM_SIZE;
  const eye = (index + 1) * CHUNK_HEIGHT - at;
  return { x: (CANVAS_WIDTH - w) / 2, y: eye - h / 2, w, h, landing };
}

function inside(point: Vec, rect: Rect): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.w &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.h
  );
}

// Centered on a street cell, an open plaza, a roof, or a skylight, so a sprite sits square on its ground.
function anchors(
  streetCells: { rows: number[]; columns: number[] },
  plazas: Plaza[],
  buildings: Building[],
  craters: Vec[],
): Anchor[] {
  const found: Anchor[] = [];
  const cratered = (x: number, y: number) =>
    craters.some((crater) => crater.x === x && crater.y === y);

  for (let row = 0; row < ROWS; row++)
    for (let column = 0; column < COLUMNS; column++) {
      if (
        !streetCells.rows.includes(row) &&
        !streetCells.columns.includes(column)
      )
        continue;

      const x = (column + 0.5) * CELL_SIZE;
      const y = (row + 0.5) * CELL_SIZE;
      if (!cratered(x, y)) found.push({ kind: "street", x, y });
    }

  for (const { x, y, w, h, bare } of plazas) {
    const center = { x: x + w / 2, y: y + h / 2 };
    found.push({ kind: "plaza", ...center });
    // A slogan is painted inside the curb, a cell in from every side of the block.
    const roomy =
      w - 2 * CELL_SIZE >= GROUND_SLOGAN_SIZE.w &&
      h - 2 * CELL_SIZE >= GROUND_SLOGAN_SIZE.h;
    if (roomy && !bare) found.push({ kind: "slogan", ...center });
  }

  for (const roof of buildings) {
    const { x, y, w, h, skylight } = roof;
    const center = { x: x + w / 2, y: y + h / 2 };
    found.push({ kind: "rooftop", ...center });
    // A mural or a telescreen covers the roof inside its parapet, so it needs the room and no
    // skylight under it.
    if (!skylight && roofFits(roof, MURAL_SIZE))
      found.push({ kind: "mural", ...center });
    if (!skylight && roofFits(roof, TELESCREEN_SIZE))
      found.push({ kind: "telescreen", ...center });
    if (skylight)
      found.push({
        kind: "skylight",
        x: skylight.x + skylight.w / 2,
        y: skylight.y + skylight.h / 2,
      });
  }
  return found;
}

function roofFits(roof: Rect, size: { w: number; h: number }): boolean {
  return roof.w - 2 * PARAPET >= size.w && roof.h - 2 * PARAPET >= size.h;
}

const layouts = new WeakMap<City, Map<number, ChunkLayout>>();

function cachedLayout(city: City, index: number): ChunkLayout {
  let chunks = layouts.get(city);
  if (!chunks) layouts.set(city, (chunks = new Map()));

  let layout = chunks.get(index);
  if (!layout) chunks.set(index, (layout = chunkLayout(city, index)));
  return layout;
}

// Open plazas can be several chunks apart; past this, the level data asks for ground its recipe lacks.
const ANCHOR_REACH = 4;

/**
 * The anchor of `kind` nearest to the point (`x`, `at`), where `at` is a level distance.
 * Returned in level space: `y` is the scroll distance at which it reaches the screen's top edge.
 * Throws if none lies within ANCHOR_REACH chunks, since that is a mistake in the level data.
 */
export function anchorNear(
  city: City,
  kind: AnchorKind,
  at: number,
  x = CANVAS_WIDTH / 2,
): Vec {
  const home = Math.floor(at / CHUNK_HEIGHT);
  let best = null as Vec | null;

  // Outward one ring of chunks at a time, until no chunk left could hold a nearer one.
  for (let reach = 0; reach <= ANCHOR_REACH; reach++) {
    for (const index of new Set([home - reach, home + reach])) {
      const top = (index + 1) * CHUNK_HEIGHT;

      for (const anchor of cachedLayout(city, index).anchors) {
        if (anchor.kind !== kind) continue;

        const found = { x: anchor.x, y: top - anchor.y };
        if (!best || nearer(found, best, at, x)) best = found;
      }
    }

    const unsearched = Math.min(
      at - (home - reach) * CHUNK_HEIGHT,
      (home + reach + 1) * CHUNK_HEIGHT - at,
    );
    // Any anchor further out is at least `unsearched` away, even straight above or below.
    if (best && Math.hypot(best.x - x, best.y - at) < unsearched) return best;
  }

  if (!best) throw new Error(`No ${kind} anchor near ${at}`);
  return best;
}

// Plain distance, not distance along the level: a vertical street has a cell at nearly any distance,
// and would otherwise win every time over the horizontal street on the side `x` asks for.
function nearer(a: Vec, b: Vec, at: number, x: number): boolean {
  return Math.hypot(a.x - x, a.y - at) < Math.hypot(b.x - x, b.y - at);
}

// A roof over the whole block, then, each by chance, a skylight, a Party banner, and a blinking lamp in
// a corner they leave free; fixtures fill what is left. Each part keeps clear of the parts before it.
function building(rng: () => number, block: Block): Building {
  const rect = blockRect(block);
  const skylight = rng() < SKYLIGHT_CHANCE ? roofSkylight(rng, block) : null;
  const banner = rng() < BANNER_CHANCE ? roofBanner(rng, rect) : null;

  const taken = [skylight, banner].filter((part): part is Rect => !!part);
  const lamp = roofLamp(rng, rect, taken);
  if (lamp) taken.push({ x: lamp.x, y: lamp.y, w: 2, h: 2 });

  return {
    ...rect,
    skylight,
    banner,
    fixtures: fixtures(rng, rect, taken),
    lamp,
  };
}

// Centered on a grid line inside the roof, so it never touches the parapet.
function roofSkylight(rng: () => number, block: Block): Rect {
  const { left, top, right, bottom } = block;

  return {
    x:
      (left + between(rng, 1, right - left - 1)) * CELL_SIZE -
      SKYLIGHT_SIZE / 2,
    y:
      (top + between(rng, 1, bottom - top - 1)) * CELL_SIZE - SKYLIGHT_SIZE / 2,
    w: SKYLIGHT_SIZE,
    h: SKYLIGHT_SIZE,
  };
}

// Hangs from the parapet, just inside one side wall.
function roofBanner(rng: () => number, roof: Rect): Rect {
  return {
    x:
      rng() < 0.5
        ? roof.x + ROOF_MARGIN
        : roof.x + roof.w - ROOF_MARGIN - BANNER_WIDTH,
    y: roof.y + PARAPET,
    w: BANNER_WIDTH,
    h: between(rng, 2, 4) * BANNER_FOLD,
  };
}

// In a roof corner the other parts leave free, if any, and only by chance.
function roofLamp(rng: () => number, roof: Rect, taken: Rect[]) {
  const near = roof.x + ROOF_MARGIN;
  const far = roof.x + roof.w - ROOF_MARGIN - 2;
  const top = roof.y + ROOF_MARGIN;
  const bottom = roof.y + roof.h - ROOF_MARGIN - 2;
  const free = [
    { x: near, y: top },
    { x: far, y: top },
    { x: near, y: bottom },
    { x: far, y: bottom },
  ].filter(
    (corner) =>
      !taken.some((part) => overlaps({ ...corner, w: 2, h: 2 }, part)),
  );

  if (free.length === 0 || rng() >= LAMP_CHANCE) return null;
  return { ...free[Math.floor(rng() * free.length)], phase: rng() };
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
    for (let column = 0; column < COLUMNS; column++)
      if (
        asphaltAround(corners, row, column) &&
        !near(row, column) &&
        rng() < CRATER_CHANCE
      )
        found.push({
          x: (column + 0.5) * CELL_SIZE,
          y: (row + 0.5) * CELL_SIZE,
        });
  return found;
}

// The cell and the ring around it, clipped at the screen's sides, hold nothing but asphalt.
function asphaltAround(corners: Terrain[][], row: number, column: number) {
  for (let r = row - 1; r <= row + 1; r++)
    for (
      let c = Math.max(0, column - 1);
      c <= Math.min(COLUMNS - 1, column + 1);
      c++
    )
      if (!pureAsphalt(corners, r, c)) return false;
  return true;
}
