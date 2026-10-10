import p5 from "p5";
import { loadAssets } from "../src/assets";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "../src/config";
import { Input } from "../src/core/Input";
import { SceneManager } from "../src/core/SceneManager";
import { initLanguage } from "../src/i18n";
import { GameScene } from "../src/scenes/GameScene";
import { resetGame } from "../src/state";
import { SCENARIOS, type Pilot } from "./scenarios";

// Long enough for the first chunks, sprites, and fonts to be built before anything is timed.
const WARMUP_FRAMES = 120;

declare global {
  interface Window {
    __bench?: unknown;
  }
}

// Every run of a scenario sees the same waves, aims, and explosions.
function seedRandom(seed: number): void {
  let a = seed;
  Math.random = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Collected first when the browser allows it, so the reading is what stays alive, not garbage.
const heap = () => {
  (window as Window & { gc?: () => void }).gc?.();
  return (
    (performance as Performance & { memory?: { usedJSHeapSize: number } })
      .memory?.usedJSHeapSize ?? 0
  );
};

const params = new URLSearchParams(location.search);
const name = params.get("scenario");
const scenario = name ? SCENARIOS[name] : undefined;

if (!scenario) {
  window.__bench = { scenarios: Object.keys(SCENARIOS) };
} else {
  // The game turns these checks off in production; "fes=1" measures what they cost in dev.
  p5.disableFriendlyErrors = params.get("fes") !== "1";
  seedRandom(1);
  initLanguage();

  new p5((p: p5) => {
    let scene: GameScene | null = null;
    let input: Input;
    let frame = 0;
    let last = 0;
    const keys = new EventTarget();
    const pilot: Pilot = {
      hold: (code) =>
        keys.dispatchEvent(Object.assign(new Event("keydown"), { code })),
      release: (code) =>
        keys.dispatchEvent(Object.assign(new Event("keyup"), { code })),
    };
    const samples = {
      update: [] as number[],
      draw: [] as number[],
      interval: [] as number[],
      enemies: [] as number[],
      bullets: [] as number[],
      explosions: [] as number[],
    };
    let heapStart = 0;

    p.setup = async () => {
      p.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
      p.pixelDensity(1);
      p.noSmooth();

      input = new Input(keys);
      const manager = new SceneManager(await loadAssets(p), input);
      resetGame();
      scene = new GameScene(p, manager);
      manager.change(scene);
      scenario.setup?.(scene, pilot);
    };

    // One tick and one draw per browser frame, timed apart, so a slow frame shows which half it was.
    p.draw = () => {
      if (!scene) return;

      const now = performance.now();
      scenario.step?.(scene, frame, pilot);
      const t0 = performance.now();
      scene.update();
      const t1 = performance.now();
      scene.draw();
      const t2 = performance.now();
      input.endFrame();

      if (frame === WARMUP_FRAMES) heapStart = heap();
      if (frame > WARMUP_FRAMES) {
        samples.update.push(t1 - t0);
        samples.draw.push(t2 - t1);
        samples.interval.push(now - last);
        samples.enemies.push(scene["enemies"].length);
        samples.bullets.push(scene["bullets"].length);
        samples.explosions.push(scene["explosions"].length);
      }
      last = now;

      if (++frame > WARMUP_FRAMES + scenario.frames) {
        p.noLoop();
        window.__bench = {
          scenario: name,
          fes: !p5.disableFriendlyErrors,
          heapDelta: heap() - heapStart,
          ...samples,
        };
      }
    };
  }, document.getElementById("bench")!);
}
