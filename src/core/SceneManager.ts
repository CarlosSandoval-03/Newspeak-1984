import type { Assets } from "../assets";
import { MAX_UPDATES_PER_FRAME, TICK_MS } from "../config";
import type { Input } from "./Input";
import type { Scene } from "./Scene";

export class SceneManager {
  readonly assets: Assets;
  readonly input: Input;
  private scene: Scene | null = null;
  private accumulator = 0;

  constructor(assets: Assets, input: Input) {
    this.assets = assets;
    this.input = input;
  }

  change(next: Scene): void {
    this.scene?.exit();
    this.scene = next;
    next.enter();
  }

  // Game logic counts frames, so it runs on a fixed tick; ms only decides how many ticks this draw owes.
  frame(ms: number): void {
    if (!this.scene) return;
    this.accumulator += ms;
    let updates = 0;
    while (this.accumulator >= TICK_MS && updates < MAX_UPDATES_PER_FRAME) {
      this.scene.update();
      this.input.endFrame();
      this.accumulator -= TICK_MS;
      updates++;
    }
    // Only whole ticks still owed are dropped; a partial tick carries over, or a 35 Hz screen would run the game slow.
    if (this.accumulator >= TICK_MS) this.accumulator = 0;
    this.scene.draw();
  }
}
