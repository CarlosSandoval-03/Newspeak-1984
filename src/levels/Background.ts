import type p5 from "p5";
import type { Assets } from "../assets";
import { CANVAS_HEIGHT, CELL_SIZE, CHUNK_HEIGHT } from "../config";
import type { TerrainDef, TilesetDef } from "../types";
import {
  chunkLayout,
  COLUMNS,
  ROWS,
  type ChunkLayout,
  type Terrain,
} from "./layout";

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
  private readonly chunks = new Map<number, p5.Graphics>();
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
    for (const [index, graphics] of this.chunks)
      if (index < visible[0].index) {
        graphics.remove();
        this.chunks.delete(index);
      }

    p.imageMode(p.CORNER);
    for (const { index, y } of visible)
      p.image(this.chunk(index), 0, Math.round(y));
  }

  private chunk(index: number): p5.Graphics {
    const built = this.chunks.get(index);
    if (built) return built;

    const graphics = this.p.createGraphics(COLUMNS * CELL_SIZE, CHUNK_HEIGHT);
    this.paint(graphics, chunkLayout(this.terrain, index));
    this.chunks.set(index, graphics);
    return graphics;
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
