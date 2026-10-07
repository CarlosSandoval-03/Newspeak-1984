import type p5 from "p5";
import type { DamageMap, PlatformDef, TilesetDef } from "./types";

// The browser can't list a folder, so every file is named here once; its path follows from the folder.
export const images = {
  sprites: [
    "player",
    "player-bank-left",
    "player-bank-right",
    "enemy-fighter",
    "enemy-bomber",
    "enemy-gyro",
    "enemy-aa-gun",
    "eye-tower",
    "thought-police",
    "thought-police-escort",
    "diary",
    "boss-fortress",
    "boss-fortress-damaged",
    "boss-airship",
    "boss-airship-damaged",
    "boss-landship",
    "boss-landship-damaged",
    "boss-wing",
    "boss-wing-damaged",
    "boss-eye",
    "boss-eye-damaged",
    "ground-tileset",
    "river-tileset",
    "rubble-tileset",
    "bridge",
    "railway",
    "crater",
    "launch-platform",
    "ministry-truth-topdown",
    "ministry-plenty-topdown",
    "ministry-peace-topdown",
    "ministry-love-topdown",
    "ministry-illustration",
    "propaganda-blimp",
    "poster-leader",
  ],
  "sprites/variants": [
    "player-shadow",
    "player-bank-left-shadow",
    "player-bank-right-shadow",
    "enemy-fighter-flash",
    "enemy-fighter-shadow",
    "enemy-fighter-allied",
    "enemy-bomber-flash",
    "enemy-bomber-shadow",
    "enemy-gyro-flash",
    "enemy-gyro-shadow",
    "enemy-aa-gun-flash",
    "eye-tower-flash",
    "thought-police-flash",
    "thought-police-shadow",
    "thought-police-escort-flash",
    "thought-police-escort-shadow",
    "propaganda-blimp-shadow",
    "boss-fortress-flash",
    "boss-fortress-shadow",
    "boss-fortress-damaged-flash",
    "boss-fortress-damaged-shadow",
    "boss-airship-flash",
    "boss-airship-shadow",
    "boss-airship-damaged-flash",
    "boss-airship-damaged-shadow",
    "boss-landship-flash",
    "boss-landship-shadow",
    "boss-landship-damaged-flash",
    "boss-landship-damaged-shadow",
    "boss-wing-flash",
    "boss-wing-shadow",
    "boss-wing-damaged-flash",
    "boss-wing-damaged-shadow",
    "boss-eye-flash",
    "boss-eye-shadow",
    "boss-eye-damaged-flash",
    "boss-eye-damaged-shadow",
  ],
  illustrations: [
    "menu-city",
    "dictionary-cover",
    "officer-portrait",
    "pilot-portrait",
    "memory-hole",
    "pause-telescreen",
    "vaporized",
    "ending-obedient",
    "ending-rebel",
  ],
} as const;

export const fonts = {
  machine: "VT323-Regular",
  paperwork: "CourierPrime-Regular",
} as const;

// JSON lives beside the sprites; loadJSON can't know a file's shape, so each list declares it.
export const tilesets = [
  "ground-tileset",
  "river-tileset",
  "rubble-tileset",
] as const;

export const damageMaps = [
  "boss-fortress-damage",
  "boss-airship-damage",
  "boss-landship-damage",
  "boss-wing-damage",
  "boss-eye-damage",
] as const;

export type Assets = Awaited<ReturnType<typeof loadAssets>>;

// One request per file, all in flight at once; a missing file rejects the whole load.
async function loadEach<N extends string, T>(
  names: readonly N[],
  load: (name: N) => Promise<T>,
): Promise<Record<N, T>> {
  const loaded = await Promise.all(
    names.map(async (name) => [name, await load(name)] as const),
  );
  return Object.fromEntries(loaded) as Record<N, T>;
}

function json<T>(p: p5, name: string): Promise<T> {
  return p.loadJSON(`assets/sprites/${name}.json`) as Promise<T>;
}

export async function loadAssets(p: p5) {
  const [
    sprites,
    variants,
    illustrations,
    machine,
    paperwork,
    tileset,
    damage,
    platform,
  ] = await Promise.all([
    loadEach(images.sprites, (name) =>
      p.loadImage(`assets/sprites/${name}.png`),
    ),
    loadEach(images["sprites/variants"], (name) =>
      p.loadImage(`assets/sprites/variants/${name}.png`),
    ),
    loadEach(images.illustrations, (name) =>
      p.loadImage(`assets/illustrations/${name}.png`),
    ),
    p.loadFont(`assets/fonts/${fonts.machine}.ttf`),
    p.loadFont(`assets/fonts/${fonts.paperwork}.ttf`),
    loadEach(tilesets, (name) => json<TilesetDef>(p, name)),
    loadEach(damageMaps, (name) => json<DamageMap>(p, name)),
    json<PlatformDef>(p, "launch-platform"),
  ]);

  return {
    image: { ...sprites, ...variants, ...illustrations },
    font: { machine, paperwork },
    tileset,
    damage,
    platform,
  };
}
