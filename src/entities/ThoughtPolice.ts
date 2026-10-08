import type p5 from "p5";
import type { Assets } from "../assets";
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
import type { Vec } from "../types";
import { Boss } from "./Boss";
import { Bullet } from "./Bullet";

const radians = (degrees: number) => (degrees * Math.PI) / 180;

// Comes down to hover, holds the sky until killed or until THOUGHT_POLICE_TIMEOUT runs out, then withdraws.
export class ThoughtPolice extends Boss {
  private phase: "entering" | "holding" | "withdrawing" = "entering";
  private holdAge = 0;
  private shots = 0;
  private readonly target: () => Vec;
  private readonly images: Assets["image"];
  private readonly fire: (bullet: Bullet) => void;

  constructor(
    target: () => Vec,
    images: Assets["image"],
    fire: (bullet: Bullet) => void,
  ) {
    const { halfSize, radius, hp, score } = THOUGHT_POLICE_STATS;
    super({ x: CANVAS_WIDTH / 2, y: -halfSize }, radius, hp, score);

    this.vel = { x: 0, y: THOUGHT_POLICE_SPEED };
    this.target = target;
    this.images = images;
    this.fire = fire;
  }

  // While true its escort keeps formation and suspicion stays frozen.
  get holding(): boolean {
    return this.alive && this.phase !== "withdrawing";
  }

  update(): void {
    super.update();

    if (this.phase === "entering" && this.pos.y >= THOUGHT_POLICE_HOVER_Y) {
      this.phase = "holding";
      this.vel = { x: 0, y: 0 };
    }

    if (this.phase === "withdrawing") {
      if (this.pos.y < -THOUGHT_POLICE_STATS.halfSize) this.alive = false;
      return;
    }

    // Counted from when they appear, the way in included: that is the wait the player sits through.
    if (this.age >= THOUGHT_POLICE_TIMEOUT) {
      this.phase = "withdrawing";
      this.vel = { x: 0, y: -THOUGHT_POLICE_SPEED };
      return;
    }

    if (this.phase !== "holding") return;

    this.holdAge++;
    this.pos.x =
      CANVAS_WIDTH / 2 +
      THOUGHT_POLICE_SWAY *
        Math.sin((2 * Math.PI * this.holdAge) / THOUGHT_POLICE_SWAY_PERIOD);

    if (this.holdAge % THOUGHT_POLICE_FIRE_INTERVAL !== 0) return;
    // Alternates a tight aimed triple, hard to stand still against, with a wide fan, hard to stand wide against.
    if (this.shots++ % 2 === 0)
      this.spread(3, radians(THOUGHT_POLICE_TRIPLE_DEGREES) * 2);
    else
      this.spread(
        THOUGHT_POLICE_FAN_COUNT,
        radians(THOUGHT_POLICE_FAN_DEGREES),
      );
  }

  draw(p: p5): void {
    const sprite = this.flash > 0 ? "thought-police-flash" : "thought-police";

    this.drawAircraft(
      p,
      this.images[sprite],
      this.images["thought-police-shadow"],
    );
  }

  // `count` bullets over `width` radians, centered on the player.
  private spread(count: number, width: number): void {
    const target = this.target();
    const aim = Math.atan2(target.y - this.pos.y, target.x - this.pos.x);
    const first = aim - width / 2;
    const step = width / (count - 1);

    for (let i = 0; i < count; i++) {
      const angle = first + i * step;
      this.fire(
        new Bullet("regime", this.pos, {
          x: Math.cos(angle) * ENEMY_BULLET_SPEED,
          y: Math.sin(angle) * ENEMY_BULLET_SPEED,
        }),
      );
    }
  }
}
