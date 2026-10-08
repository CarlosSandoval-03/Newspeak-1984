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
  STEEL,
} from "../config";
import type { TerrainDef, TilesetDef } from "../types";
import {
  BANNER_FOLD,
  type Building,
  chunkLayout,
  COLUMNS,
  PARAPET,
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
  private readonly terrain: TerrainDef;
  private readonly assets: Assets;
  private readonly chunks = new Map<
    number,
    { graphics: p5.Graphics; lamps: Lamp[] }
  >();
  private tiles: Record<
    TilesetName,
    Map<string, { x: number; y: number }>
  > | null = null;

  constructor(p: p5, terrain: TerrainDef, assets: Assets) {
    this.p = p;
    this.terrain = terrain;
    this.assets = assets;
  }

  // Two image() calls a frame, however much the chunks hold.
  draw(scroll: number): void {
    const { p } = this;
    const visible = visibleChunks(scroll);
    const above = visible[visible.length - 1].index + 1;

    // The chunk above is built while still off screen, so its cost never lands on a frame that shows it.
    for (const { index } of visible) this.chunk(index);
    this.chunk(above);
    for (const [index, chunk] of this.chunks)
      if (index < visible[0].index) {
        chunk.graphics.remove();
        this.chunks.delete(index);
      }

    p.imageMode(p.CORNER);
    for (const { index, y } of visible)
      p.image(this.chunk(index).graphics, 0, Math.round(y));

    // The scroll moves one step per tick, so it doubles as the lamps' clock.
    p.noStroke();
    for (const { index, y } of visible)
      for (const lamp of this.chunk(index).lamps) {
        const on = Math.floor(scroll / LAMP_BLINK_FRAMES + lamp.phase * 2) % 2;
        p.fill(on ? RED_LIGHT : RED_DARK);
        p.rect(lamp.x, Math.round(y) + lamp.y, LAMP_SIZE, LAMP_SIZE);
      }
  }

  private chunk(index: number) {
    const built = this.chunks.get(index);
    if (built) return built;

    const layout = chunkLayout(this.terrain, index);
    const graphics = this.p.createGraphics(COLUMNS * CELL_SIZE, CHUNK_HEIGHT);
    this.paint(graphics, layout);

    const chunk = {
      graphics,
      lamps: layout.buildings.flatMap((building) =>
        building.lamp ? [building.lamp] : [],
      ),
    };
    this.chunks.set(index, chunk);
    return chunk;
  }

  private paint(graphics: p5.Graphics, layout: ChunkLayout): void {
    const { image } = this.assets;
    const tiles = this.tileLookup();

    for (let row = 0; row < ROWS; row++)
      for (let column = 0; column < COLUMNS; column++) {
        const { tileset, key } = cellTile(layout.corners, row, column);
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

    graphics.imageMode(graphics.CENTER);
    for (const crater of layout.craters)
      graphics.image(image.crater, crater.x, crater.y);

    graphics.noStroke();
    for (const building of layout.buildings) roof(graphics, building);
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

function roof(g: p5.Graphics, building: Building): void {
  const { x, y, w, h } = building;

  g.fill(INK);
  g.rect(x, y, w, h);
  g.fill(CONCRETE);
  g.rect(x + PARAPET, y + PARAPET, w - PARAPET * 2, h - PARAPET * 2);
  // A lit top edge lifts the roof off the plaza around it.
  g.fill(STEEL);
  g.rect(x + PARAPET, y + PARAPET, w - PARAPET * 2, 1);

  const { skylight, banner } = building;
  if (skylight) {
    g.fill(INK);
    g.rect(skylight.x, skylight.y, skylight.w, skylight.h);
    g.fill(CONCRETE);
    for (let at = SKYLIGHT_PANE; at < skylight.w; at += SKYLIGHT_PANE) {
      g.rect(skylight.x + at, skylight.y, 1, skylight.h);
      g.rect(skylight.x, skylight.y + at, skylight.w, 1);
    }
  }

  for (const fixture of building.fixtures) {
    const { x, y, w, h } = fixture;

    if (fixture.kind === "tank") {
      g.fill(INK);
      g.circle(x + w / 2, y + h / 2, w);
      g.fill(STEEL);
      g.circle(x + w / 2, y + h / 2, w - 2);
      continue;
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
  if (banner) {
    g.fill(RED);
    g.rect(banner.x, banner.y, banner.w, banner.h);
    g.fill(RED_DARK);
    g.rect(banner.x + banner.w - 1, banner.y, 1, banner.h);
    for (let at = BANNER_FOLD; at < banner.h; at += BANNER_FOLD)
      g.rect(banner.x, banner.y + at - 1, banner.w, 1);
  }
}
