import type p5 from "p5";

const images = {
  player: "sprites/player.png",
  menuCity: "illustrations/menu-city.png",
} as const;

const fonts = {
  machine: "fonts/VT323-Regular.ttf",
  paperwork: "fonts/CourierPrime-Regular.ttf",
} as const;

const data = {
  groundTiles: "sprites/ground-tileset.json",
  launchPlatform: "sprites/launch-platform.json",
} as const;

export type Assets = Awaited<ReturnType<typeof loadAssets>>;

// Type guard to narrow down PromiseSettledResult to PromiseFulfilledResult
function isFulfilled<T>(result: PromiseSettledResult<T>) {
  return result.status === "fulfilled";
}

// One request per file, all in flight at once; a missing file rejects the whole promise.
async function loadAll<K extends string, T>(
  paths: Record<K, string>,
  load: (path: string) => Promise<T>,
): Promise<Record<K, T>> {
  const entries = await Promise.allSettled(
    Object.entries<string>(paths).map(
      async ([key, path]) => [key, await load(`assets/${path}`)] as const,
    ),
  );
  const fulfilledEntries = entries.filter(isFulfilled).map((res) => res.value);
  return Object.fromEntries(fulfilledEntries) as Record<K, T>;
}

export async function loadAssets(p: p5) {
  const [image, font, json] = await Promise.all([
    loadAll(images, (path) => p.loadImage(path)),
    loadAll(fonts, (path) => p.loadFont(path)),
    loadAll(data, (path) => p.loadJSON(path)),
  ]);

  return { image, font, json };
}
