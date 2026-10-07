import { describe, expect, it } from "vitest";
import { damageMaps, fonts, images, tilesets } from "./assets";
import type { DamageMap, PlatformDef, TilesetDef } from "./types";

// Vite can list public/ at test time; the game itself never reads these globs.
const namesOnDisk = (paths: Record<string, unknown>) =>
  Object.keys(paths)
    .map((path) => path.slice(path.lastIndexOf("/") + 1, path.lastIndexOf(".")))
    .sort();

const sortedCopy = (names: readonly string[]) => [...names].sort();

const sprites = import.meta.glob<string>("/public/assets/sprites/*.png", {
  eager: true,
  query: "?inline",
  import: "default",
});

// A PNG stores its width and height big-endian at bytes 16–23.
function pngSize(name: string): { width: number; height: number } {
  const dataUrl = sprites[`/public/assets/sprites/${name}.png`];
  if (!dataUrl) throw new Error(`no sprite named ${name}`);

  const bytes = atob(dataUrl.slice(dataUrl.indexOf(",") + 1));
  const u32 = (at: number) =>
    ((bytes.charCodeAt(at) << 24) |
      (bytes.charCodeAt(at + 1) << 16) |
      (bytes.charCodeAt(at + 2) << 8) |
      bytes.charCodeAt(at + 3)) >>>
    0;

  return { width: u32(16), height: u32(20) };
}

function json<T>(name: string): T {
  const files = import.meta.glob<unknown>("/public/assets/sprites/*.json", {
    eager: true,
    import: "default",
  });

  const file = files[`/public/assets/sprites/${name}.json`];
  if (!file) throw new Error(`no JSON named ${name}`);
  return file as T;
}

describe("the asset list matches the files on disk", () => {
  it("names every image, and only those", () => {
    expect(sortedCopy(images.sprites)).toEqual(namesOnDisk(sprites));
    expect(sortedCopy(images["sprites/variants"])).toEqual(
      namesOnDisk(import.meta.glob("/public/assets/sprites/variants/*.png")),
    );
    expect(sortedCopy(images.illustrations)).toEqual(
      namesOnDisk(import.meta.glob("/public/assets/illustrations/*.png")),
    );
  });

  it("names every font and JSON file, and only those", () => {
    expect(sortedCopy(Object.values(fonts))).toEqual(
      namesOnDisk(import.meta.glob("/public/assets/fonts/*.ttf")),
    );
    expect(sortedCopy([...tilesets, ...damageMaps, "launch-platform"])).toEqual(
      namesOnDisk(import.meta.glob("/public/assets/sprites/*.json")),
    );
  });
});

describe("asset data", () => {
  it.each(tilesets)("%s has each corner combination exactly once", (name) => {
    const tileset = json<TilesetDef>(name);
    const sheet = pngSize(name);

    const combos = tileset.tiles.map(
      ({ corners }) => `${corners.NW}${corners.NE}${corners.SW}${corners.SE}`,
    );
    expect(new Set(combos).size).toBe(16);

    for (const { x, y } of tileset.tiles) {
      expect(x + tileset.tileSize).toBeLessThanOrEqual(sheet.width);
      expect(y + tileset.tileSize).toBeLessThanOrEqual(sheet.height);
    }
  });

  it.each(damageMaps)("%s fits its boss sprite", (name) => {
    const map = json<DamageMap>(name);
    const boss = name.replace(/-damage$/, "");

    expect(map.sprite).toBe(`${boss}.png`);
    expect(map.damaged).toBe(`${boss}-damaged.png`);
    expect(pngSize(`${boss}-damaged`)).toEqual(pngSize(boss));

    const { width, height } = pngSize(boss);
    expect(map.regions.length).toBeGreaterThan(0);
    for (const r of map.regions) {
      expect(r.x >= 0 && r.y >= 0 && r.w > 0 && r.h > 0).toBe(true);
      expect(r.x + r.w).toBeLessThanOrEqual(width);
      expect(r.y + r.h).toBeLessThanOrEqual(height);
    }
  });

  it("launch-platform lifts off ahead of the eye and touches down behind it", () => {
    const platform = json<PlatformDef>("launch-platform");
    const { width, height } = pngSize("launch-platform");

    expect(platform.liftoff.y).toBeLessThan(platform.park.y);
    expect(platform.park.y).toBeLessThan(platform.touchdown.y);

    for (const point of [
      platform.park,
      platform.liftoff,
      platform.touchdown,
      ...platform.lamps,
    ]) {
      expect(point.x >= 0 && point.x < width).toBe(true);
      expect(point.y >= 0 && point.y < height).toBe(true);
    }
  });
});
