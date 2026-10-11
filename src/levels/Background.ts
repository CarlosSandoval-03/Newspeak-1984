import type p5 from "p5";
import type { Assets } from "../assets";
import {
  CANVAS_HEIGHT,
  CELL_SIZE,
  CHUNK_HEIGHT,
  CONCRETE,
  INK,
  LAMP_BLINK_FRAMES,
  RED,
  RED_DARK,
  RED_LIGHT,
  RUNWAY_LAMP_SPACING,
  RUNWAY_LAMP_STEP,
  STEEL,
} from "../config";
import type { TilesetDef } from "../types";
import {
  type Airfield,
  BANNER_FOLD,
  type Building,
  chunkLayout,
  type City,
  COLUMNS,
  type Fixture,
  PARAPET,
  type Rect,
  ROWS,
  type ChunkLayout,
  type Terrain,
} from "./layout";

type Lamp = NonNullable<Building["lamp"]>;
const LAMP_SIZE = 2;
const SKYLIGHT_PANE = 6;

type TilesetName = "ground-tileset" | "rubble-tileset";

// Asphalt is every tileset's lower terrain, so the other corner decides which sheet a cell uses.
const TILESETS: Record<Exclude<Terrain, "asphalt">, TilesetName> = {
  plaza: "ground-tileset",
  rubble: "rubble-tileset",
};

// The screen's top edge sits at level distance `scroll` and its bottom at `scroll - CANVAS_HEIGHT`;
// chunk `k` covers [k, k + 1) × CHUNK_HEIGHT, so `y` is where its top edge lands on screen.
export function visibleChunks(scroll: number): { index: number; y: number }[] {
  const first = Math.floor((scroll - CANVAS_HEIGHT) / CHUNK_HEIGHT);
  const last = Math.ceil(scroll / CHUNK_HEIGHT) - 1;

  const found = [];
  for (let index = first; index <= last; index++)
    found.push({ index, y: scroll - (index + 1) * CHUNK_HEIGHT });
  return found;
}

// The tile a cell needs, as its sheet and its corners in "NW,NE,SW,SE" order.
export function cellTile(
  corners: Terrain[][],
  row: number,
  column: number,
): { tileset: TilesetName; key: string } {
  const cell = [
    corners[row][column],
    corners[row][column + 1],
    corners[row + 1][column],
    corners[row + 1][column + 1],
  ];
  const other = cell.find((terrain) => terrain !== "asphalt");

  return {
    tileset: other ? TILESETS[other] : "ground-tileset",
    key: cell.map((t) => (t === "asphalt" ? "lower" : "upper")).join(","),
  };
}

export function tileKey(corners: TilesetDef["tiles"][number]["corners"]) {
  return [corners.NW, corners.NE, corners.SW, corners.SE].join(",");
}

export class Background {
  private readonly p: p5;
  private readonly city: City;
  private readonly assets: Assets;
  private readonly chunks = new Map<
    number,
    { graphics: p5.Graphics; lamps: Lamp[]; airfields: Airfield[] }
  >();
  private tiles: Record<
    TilesetName,
    Map<string, { x: number; y: number }>
  > | null = null;

  constructor(p: p5, city: City, assets: Assets) {
    this.p = p;
    this.city = city;
    this.assets = assets;
  }

  // Keeps the chunks around the screen built, then draws the visible ones (two image() calls, however
  // much they hold), with the lamps that change over them every frame.
  draw(scroll: number): void {
    const { p } = this;
    const visible = visibleChunks(scroll);
    this.keepChunks(visible);

    p.imageMode(p.CORNER);
    p.noStroke();
    for (const { index, y } of visible) {
      const chunk = this.chunk(index);
      const top = Math.round(y);

      p.image(chunk.graphics, 0, top);
      this.roofLamps(chunk.lamps, top, scroll);
      for (const airfield of chunk.airfields)
        this.runwayLamps(airfield, top, scroll);
    }
  }

  // The chunk above is built while still off screen, so its cost never lands on a frame that shows it;
  // chunks that have scrolled past are freed.
  private keepChunks(visible: { index: number }[]): void {
    for (const { index } of visible) this.chunk(index);
    this.chunk(visible[visible.length - 1].index + 1);

    for (const [index, chunk] of this.chunks)
      if (index < visible[0].index) {
        chunk.graphics.remove();
        this.chunks.delete(index);
      }
  }

  // The scroll moves one step per tick, so it doubles as the lamps' clock.
  private roofLamps(lamps: Lamp[], chunkY: number, scroll: number): void {
    const { p } = this;

    for (const lamp of lamps) {
      const on = Math.floor(scroll / LAMP_BLINK_FRAMES + lamp.phase * 2) % 2;
      p.fill(on ? RED_LIGHT : RED_DARK);
      p.rect(lamp.x, chunkY + lamp.y, LAMP_SIZE, LAMP_SIZE);
    }
  }

  // Rows of lit sockets run up the runway with a plane taking off, and down it toward one landing.
  private runwayLamps(
    airfield: Airfield,
    chunkY: number,
    scroll: number,
  ): void {
    const { p } = this;
    const { lamps } = this.assets.platform;
    const rows = [...new Set(lamps.map((lamp) => lamp.y))].sort(
      (a, b) => a - b,
    );
    const step = Math.floor(scroll / RUNWAY_LAMP_STEP);
    const chase = airfield.landing ? -step : step;

    p.fill(RED_LIGHT);
    for (const lamp of lamps) {
      const row = rows.indexOf(lamp.y);
      if ((row + chase) % RUNWAY_LAMP_SPACING !== 0) continue;
      p.rect(
        airfield.x + lamp.x,
        chunkY + airfield.y + lamp.y,
        LAMP_SIZE,
        LAMP_SIZE,
      );
    }
  }

  private chunk(index: number) {
    const built = this.chunks.get(index);
    if (built) return built;

    const layout = chunkLayout(this.city, index);
    const graphics = this.p.createGraphics(COLUMNS * CELL_SIZE, CHUNK_HEIGHT);
    this.paint(graphics, layout);

    const chunk = {
      graphics,
      lamps: layout.buildings.flatMap((building) =>
        building.lamp ? [building.lamp] : [],
      ),
      airfields: layout.airfields,
    };
    this.chunks.set(index, chunk);
    return chunk;
  }

  // Layer by layer, from the ground up: the tiles, the craters, the rooftops, and the launch platforms.
  private paint(graphics: p5.Graphics, layout: ChunkLayout): void {
    const { image } = this.assets;

    this.paintTiles(graphics, layout.corners);

    graphics.imageMode(graphics.CENTER);
    for (const crater of layout.craters)
      graphics.image(image.crater, crater.x, crater.y);

    graphics.noStroke();
    for (const building of layout.buildings) roof(graphics, building);

    graphics.imageMode(graphics.CORNER);
    for (const { x, y } of layout.airfields)
      graphics.image(image["launch-platform"], x, y);
  }

  // Each cell gets the tile whose corners match its own, from the sheet of its non-asphalt terrain.
  private paintTiles(graphics: p5.Graphics, corners: Terrain[][]): void {
    const { image } = this.assets;
    const tiles = this.tileLookup();

    for (let row = 0; row < ROWS; row++)
      for (let column = 0; column < COLUMNS; column++) {
        const { tileset, key } = cellTile(corners, row, column);
        const source = tiles[tileset].get(key);
        if (!source) throw new Error(`${tileset} has no tile ${key}`);

        graphics.image(
          image[tileset],
          column * CELL_SIZE,
          row * CELL_SIZE,
          CELL_SIZE,
          CELL_SIZE,
          source.x,
          source.y,
          CELL_SIZE,
          CELL_SIZE,
        );
      }
  }

  // Built on first use, so a scene that never draws needs no tilesets.
  private tileLookup() {
    if (!this.tiles) {
      const lookup = (name: TilesetName) =>
        new Map(
          this.assets.tileset[name].tiles.map((tile) => [
            tileKey(tile.corners),
            { x: tile.x, y: tile.y },
          ]),
        );
      this.tiles = {
        "ground-tileset": lookup("ground-tileset"),
        "rubble-tileset": lookup("rubble-tileset"),
      };
    }
    return this.tiles;
  }
}

// The slab with its parapet, then what stands on it: the skylight, the fixtures, and the banner.
function roof(g: p5.Graphics, building: Building): void {
  const { x, y, w, h } = building;

  g.fill(INK);
  g.rect(x, y, w, h);
  g.fill(CONCRETE);
  g.rect(x + PARAPET, y + PARAPET, w - PARAPET * 2, h - PARAPET * 2);
  // A lit top edge lifts the roof off the plaza around it.
  g.fill(STEEL);
  g.rect(x + PARAPET, y + PARAPET, w - PARAPET * 2, 1);

  if (building.skylight) skylight(g, building.skylight);
  for (const fixture of building.fixtures) roofFixture(g, fixture);
  if (building.banner) banner(g, building.banner);
}

// An ink well split into panes by concrete mullions.
function skylight(g: p5.Graphics, { x, y, w, h }: Rect): void {
  g.fill(INK);
  g.rect(x, y, w, h);
  g.fill(CONCRETE);
  for (let at = SKYLIGHT_PANE; at < w; at += SKYLIGHT_PANE) {
    g.rect(x + at, y, 1, h);
    g.rect(x, y + at, w, 1);
  }
}

function roofFixture(g: p5.Graphics, fixture: Fixture): void {
  const { x, y, w, h } = fixture;

  if (fixture.kind === "tank") {
    g.fill(INK);
    g.circle(x + w / 2, y + h / 2, w);
    g.fill(STEEL);
    g.circle(x + w / 2, y + h / 2, w - 2);
    return;
  }

  g.fill(INK);
  g.rect(x, y, w, h);
  g.fill(STEEL);
  g.rect(x + 1, y + 1, w - 2, h - 2);
  // A hatch's handle, so it reads as a door and not a vent.
  if (fixture.kind === "hatch") {
    g.fill(INK);
    g.rect(x + 2, y + h / 2, w - 4, 1);
  }
}

// The Party's banner: base red, with its folds and its shaded edge in the dark red.
function banner(g: p5.Graphics, { x, y, w, h }: Rect): void {
  g.fill(RED);
  g.rect(x, y, w, h);
  g.fill(RED_DARK);
  g.rect(x + w - 1, y, 1, h);
  for (let at = BANNER_FOLD; at < h; at += BANNER_FOLD)
    g.rect(x, y + at - 1, w, 1);
}
