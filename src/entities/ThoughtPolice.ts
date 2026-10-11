import type p5 from "p5";
import {
  CANVAS_WIDTH,
  ENEMY_BULLET_SPEED,
  THOUGHT_POLICE_FAN_COUNT,
  THOUGHT_POLICE_FAN_DEGREES,
  THOUGHT_POLICE_FIRE_INTERVAL,
  THOUGHT_POLICE_HOVER_Y,
  THOUGHT_POLICE_SPEED,
  THOUGHT_POLICE_STATS,
  THOUGHT_POLICE_SWAY,
  THOUGHT_POLICE_SWAY_PERIOD,
  THOUGHT_POLICE_TIMEOUT,
  THOUGHT_POLICE_TRIPLE_DEGREES,
} from "../config";
import { angleTo, fan, radians, velocity } from "../core/math";
import { Boss } from "./Boss";
import { Bullet } from "./Bullet";
import type { Arena } from "./Entity";

// Comes down to hover, holds the sky until killed or until THOUGHT_POLICE_TIMEOUT runs out, then withdraws.
export class ThoughtPolice extends Boss {
  private phase: "entering" | "holding" | "withdrawing" = "entering";
  private holdAge = 0;
  private shots = 0;
  private readonly arena: Arena;

  constructor(arena: Arena) {
    const { halfSize, radius, hp, score } = THOUGHT_POLICE_STATS;
    super({ x: CANVAS_WIDTH / 2, y: -halfSize }, radius, hp, score);

    this.vel = { x: 0, y: THOUGHT_POLICE_SPEED };
    this.arena = arena;
  }

  // While true its escort keeps formation and suspicion stays frozen.
  get holding(): boolean {
    return this.alive && this.phase !== "withdrawing";
  }

  update(): void {
    super.update();
    if (this.phase === "withdrawing") {
      this.leaveWhenGone();
      return;
    }

    // Counted from when they appear, the way in included: that is the wait the player sits through.
    if (this.age >= THOUGHT_POLICE_TIMEOUT) {
      this.withdraw();
      return;
    }
    if (this.phase === "entering") this.settleAtHover();
    if (this.phase === "holding") this.hold();
  }

  draw(p: p5): void {
    const { images } = this.arena;
    const sprite = this.flash > 0 ? "thought-police-flash" : "thought-police";

    this.drawAircraft(p, images[sprite], images["thought-police-shadow"]);
  }

  private settleAtHover(): void {
    if (this.pos.y < THOUGHT_POLICE_HOVER_Y) return;

    this.phase = "holding";
    this.vel = { x: 0, y: 0 };
  }

  private withdraw(): void {
    this.phase = "withdrawing";
    this.vel = { x: 0, y: -THOUGHT_POLICE_SPEED };
  }

  private leaveWhenGone(): void {
    if (this.pos.y < -THOUGHT_POLICE_STATS.halfSize) this.alive = false;
  }

  // Sways, alternating a tight aimed triple, hard to stand still against, with a wide fan, hard to
  // stand wide against.
  private hold(): void {
    this.holdAge++;
    this.pos.x =
      CANVAS_WIDTH / 2 +
      THOUGHT_POLICE_SWAY *
        Math.sin((2 * Math.PI * this.holdAge) / THOUGHT_POLICE_SWAY_PERIOD);

    if (this.holdAge % THOUGHT_POLICE_FIRE_INTERVAL !== 0) return;
    if (this.shots++ % 2 === 0)
      this.spread(3, radians(THOUGHT_POLICE_TRIPLE_DEGREES) * 2);
    else
      this.spread(
        THOUGHT_POLICE_FAN_COUNT,
        radians(THOUGHT_POLICE_FAN_DEGREES),
      );
  }

  // `count` bullets over `width` radians, centered on the player.
  private spread(count: number, width: number): void {
    const aim = angleTo(this.pos, this.arena.target());

    for (const angle of fan(aim, count, width))
      this.arena.fire(
        new Bullet("regime", this.pos, velocity(angle, ENEMY_BULLET_SPEED)),
      );
  }
}
