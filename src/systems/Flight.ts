import {
  AIRFIELD_AT,
  DESCENT_DISTANCE,
  LANDING_ACCEL,
  LANDING_HOLD_FRAMES,
  LANDING_LEAD,
  LANDING_SPEED,
  LIFTOFF_FRAMES,
  PLAYER_SPAWN,
  SCROLL_SPEED,
  TAKEOFF_RAMP_FRAMES,
} from "../config";
import { smoothstep } from "../core/math";
import type { Player } from "../entities/Player";
import type { LevelDef, PlatformDef } from "../types";

type Phase = "takeoff" | "flying" | "landing";

// A level's flight as the regime schedules it: the takeoff from the start platform, the stretch the
// pilot flies until the city stops at the level's length, and the landing on the next platform.
// It owns the scroll and its speed, and flies the plane itself whenever the pilot may not.
export class Flight {
  // Parked on the start platform's eye.
  scroll = AIRFIELD_AT + PLAYER_SPAWN.y;
  speed = 0;
  private phase: Phase = "takeoff";
  private liftoffFrames = 0;
  private takeoffFrames = 0;
  private landedFrames = 0;
  private readonly player: Player;
  private readonly level: Pick<LevelDef, "length">;
  private readonly platform: PlatformDef;

  constructor(
    player: Player,
    level: Pick<LevelDef, "length">,
    platform: PlatformDef,
  ) {
    this.player = player;
    this.level = level;
    this.platform = platform;
    player.altitude = 0;
  }

  // The pilot has the stick; outside it, nothing can touch the plane.
  get flying(): boolean {
    return this.phase === "flying";
  }

  get landing(): boolean {
    return this.phase === "landing";
  }

  // The city has stopped for the level's boss.
  get atEnd(): boolean {
    return this.scroll >= this.level.length;
  }

  // Parked on the landing eye long enough: the level is over.
  get landed(): boolean {
    return this.landedFrames >= LANDING_HOLD_FRAMES;
  }

  // The scroll at which the landing platform's eye lies under the parked plane.
  private get parked(): number {
    return this.level.length + LANDING_LEAD + PLAYER_SPAWN.y;
  }

  // Sets this tick's speed: rolling and climbing on takeoff, standing still at the city's end, and
  // braking toward the eye while landing.
  update(): void {
    if (this.phase === "takeoff") this.takeOff();
    else if (this.phase === "landing") this.land();
    else if (this.atEnd) this.speed = 0;
  }

  advance(): void {
    this.scroll += this.speed;
  }

  startLanding(): void {
    this.phase = "landing";
  }

  // The runway rolls under the parked plane, and once the lift-off line has passed beneath it, the
  // plane climbs; the pilot only takes the stick in the air.
  private takeOff(): void {
    const { park, liftoff } = this.platform;

    // The runway speeds up under the plane, which holds its place on screen.
    this.takeoffFrames++;
    this.speed =
      SCROLL_SPEED * Math.min(1, this.takeoffFrames / TAKEOFF_RAMP_FRAMES);

    // Still on the ground until the lift-off line reaches the plane.
    const plane = this.scroll - PLAYER_SPAWN.y;
    if (plane < AIRFIELD_AT + park.y - liftoff.y) return;

    // The climb, and the stick handed over once it is done.
    this.player.altitude = smoothstep(++this.liftoffFrames / LIFTOFF_FRAMES);
    if (this.liftoffFrames === LIFTOFF_FRAMES) this.phase = "flying";
  }

  // The city comes in fast, then brakes evenly so the landing platform's eye stops under the plane,
  // which lines up with the runway and comes down to touch it at the touchdown line.
  private land(): void {
    const { park, touchdown } = this.platform;
    const left = this.parked - this.scroll;

    // Speed up to LANDING_SPEED, but never so fast that braking evenly can't stop on the eye.
    this.speed = Math.min(
      this.speed + LANDING_ACCEL,
      LANDING_SPEED,
      Math.sqrt(2 * LANDING_ACCEL * left),
      left,
    );

    // Come down over the last DESCENT_DISTANCE before the touchdown line, lined up with the runway.
    const aboveTouchdown = left - (touchdown.y - park.y);
    this.player.altitude = smoothstep(aboveTouchdown / DESCENT_DISTANCE);
    this.player.autopilot(PLAYER_SPAWN);

    // On the eye: stop exactly there and count the hold.
    if (left > 0.01) return;
    this.scroll = this.parked;
    this.speed = 0;
    this.landedFrames++;
  }
}
