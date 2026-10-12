import type p5 from "p5";
import {
  ALERT_FIRE_MULT,
  CAMO_ALPHA,
  BOMBER_FAN_COUNT,
  BOMBER_FAN_SPREAD_DEGREES,
  BOMBER_FIRE_INTERVAL,
  CANVAS_HEIGHT,
  ENEMY_BULLET_SPEED,
  ESCORT_FIRE_INTERVAL,
  ESCORT_OFFSET,
  ENEMY_FIRE_INTERVAL,
  ENEMY_FIRE_JITTER,
  ENEMY_STATS,
  HOMING_FRAMES,
  HOMING_TURN_RATE,
  SINE_AMPLITUDE,
  SINE_PERIOD,
  STEEL,
} from "../config";
import { angleTo, fan, radians, velocity, wrapAngle } from "../core/math";
import { state } from "../state";
import { ALERT, type EnemyKind, type Vec, type Word } from "../types";
import { Bullet } from "./Bullet";
import { Destructible } from "./Destructible";
import type { Disguise } from "../systems/Propaganda";
import type { Arena } from "./Entity";

const SPRITES = {
  straight: "enemy-fighter",
  sine: "enemy-fighter",
  bomber: "enemy-bomber",
  homing: "enemy-gyro",
  escort: "thought-police-escort",
} as const;

// The escort flies in formation while its leader holds the sky, and withdraws when it stops.
export interface Leader {
  readonly pos: Vec;
  readonly holding: boolean;
}

// Which side of the leader an escort keeps: -1 left, 1 right.
interface Formation {
  leader: Leader;
  side: -1 | 1;
}

// The rotor turns over the hub, a little behind the sprite's center.
const HUB_OFFSET = 4;
const ROTOR_LENGTH = 40;
const ROTOR_ALPHA = 0.6;
const ROTOR_SPIN = 0.4;

// Read at every reload, so shooters already on screen speed up from their next shot.
export function reloadDelay(base: number): number {
  const interval =
    state.alertLevel >= ALERT.alert ? base / ALERT_FIRE_MULT : base;
  return Math.round(interval + (Math.random() * 2 - 1) * ENEMY_FIRE_JITTER);
}

export class Enemy extends Destructible {
  readonly kind: EnemyKind;
  readonly score: number;
  // Let fall where it is shot down; a crash takes the word down with it.
  drops: Word | null = null;
  // Only its look changes: a camouflaged enemy still flies, fires, and can be hit.
  camo = false;
  // Set by the scene while TRUTH is active.
  revealed = false;
  // A fighter Propaganda dresses in the ally's colors: only its look changes, and it still fires.
  disguise: Disguise | null = null;
  private readonly startX: number;
  private age = 0;
  // Radians, with π/2 straight down the screen; only an autogyro ever turns.
  private heading = Math.PI / 2;
  private fireTimer: number;
  private readonly arena: Arena;
  private readonly formation: Formation | null;

  constructor(
    kind: EnemyKind,
    pos: Vec,
    arena: Arena,
    formation: Formation | null = null,
  ) {
    const stats = ENEMY_STATS[kind];
    super(pos, stats.radius, stats.hp);

    this.kind = kind;
    this.score = stats.score;
    this.vel = { x: 0, y: stats.speed };
    this.startX = pos.x;
    this.arena = arena;
    this.formation = formation;
    this.fireTimer = this.nextFireDelay();
  }

  private get withdrawing(): boolean {
    return this.formation !== null && !this.formation.leader.holding;
  }

  // An autogyro's weapon is itself, and a withdrawing escort has stopped fighting.
  private get armed(): boolean {
    return this.kind !== "homing" && !this.withdrawing;
  }

  update(): void {
    this.age++;
    this.move();
    if (this.hasLeft()) {
      this.alive = false;
      return;
    }
    if (this.armed) this.reload();
  }

  draw(p: p5): void {
    const { images } = this.arena;
    const sprite = SPRITES[this.kind];
    const body = this.body(sprite);
    const turn = this.heading - Math.PI / 2;

    this.drawAircraft(
      p,
      images[body],
      images[`${sprite}-shadow`],
      turn,
      this.camo && !this.revealed ? CAMO_ALPHA : 1,
    );
    if (this.kind === "homing") this.drawRotor(p, turn);
  }

  // The flash over everything; otherwise the ally's colors while the disguise holds.
  private body(sprite: (typeof SPRITES)[EnemyKind]) {
    if (this.flash > 0) return `${sprite}-flash` as const;
    return this.disguise?.shown() ? "enemy-fighter-allied" : sprite;
  }

  private move(): void {
    if (this.kind === "homing") this.steer();
    if (this.formation) this.keepFormation(this.formation);
    super.update();
    if (this.kind === "sine")
      this.pos.x =
        this.startX +
        SINE_AMPLITUDE * Math.sin((this.age / SINE_PERIOD) * 2 * Math.PI);
  }

  // Most enemies only fly down, so leaving means falling off the bottom;
  // an autogyro can leave by any edge, and a withdrawing escort by the top.
  private hasLeft(): boolean {
    const half = ENEMY_STATS[this.kind].halfSize;
    return this.kind === "homing" || this.withdrawing
      ? this.isOffscreen(half)
      : this.pos.y - half > CANVAS_HEIGHT;
  }

  // The clock only runs on screen, so nothing shoots from beyond the top edge.
  private reload(): void {
    if (this.pos.y < 0 || --this.fireTimer > 0) return;

    this.fireTimer = this.nextFireDelay();
    if (this.kind === "bomber") this.fireFan();
    else this.fireAt(this.aim());
  }

  // Turns toward the player no faster than HOMING_TURN_RATE, so a sharp sidestep shakes it off.
  private steer(): void {
    if (this.age <= HOMING_FRAMES) {
      const off = wrapAngle(this.aim() - this.heading);
      this.heading +=
        Math.sign(off) * Math.min(Math.abs(off), HOMING_TURN_RATE);
    }

    this.vel = velocity(this.heading, ENEMY_STATS[this.kind].speed);
  }

  // Beside the leader while it holds the sky; straight up and away once it stops.
  private keepFormation({ leader, side }: Formation): void {
    if (!leader.holding) {
      this.vel = { x: 0, y: -ENEMY_STATS[this.kind].speed };
      return;
    }

    this.vel = { x: 0, y: 0 };
    this.pos.x = leader.pos.x + side * ESCORT_OFFSET.x;
    this.pos.y = leader.pos.y + ESCORT_OFFSET.y;
  }

  private drawRotor(p: p5, turn: number): void {
    const context = p.drawingContext as CanvasRenderingContext2D;
    const x = Math.round(this.pos.x - Math.sin(turn) * HUB_OFFSET);
    const y = Math.round(this.pos.y + Math.cos(turn) * HUB_OFFSET);
    const spin = this.age * ROTOR_SPIN;

    context.globalAlpha = ROTOR_ALPHA;
    p.stroke(STEEL);
    p.strokeWeight(1);
    for (const blade of [spin, spin + Math.PI / 2]) {
      const dx = (Math.cos(blade) * ROTOR_LENGTH) / 2;
      const dy = (Math.sin(blade) * ROTOR_LENGTH) / 2;
      p.line(x - dx, y - dy, x + dx, y + dy);
    }
    p.noStroke();
    context.globalAlpha = 1;
  }

  private nextFireDelay(): number {
    const base =
      this.kind === "bomber"
        ? BOMBER_FIRE_INTERVAL
        : this.kind === "escort"
          ? ESCORT_FIRE_INTERVAL
          : ENEMY_FIRE_INTERVAL;
    return reloadDelay(base);
  }

  private aim(): number {
    return angleTo(this.pos, this.arena.target());
  }

  private fireAt(angle: number): void {
    const owner = this.kind === "escort" ? "regime" : "enemy";
    this.arena.fire(
      new Bullet(owner, this.pos, velocity(angle, ENEMY_BULLET_SPEED)),
    );
  }

  private fireFan(): void {
    const spread = radians(BOMBER_FAN_SPREAD_DEGREES);
    for (const angle of fan(this.aim(), BOMBER_FAN_COUNT, spread))
      this.fireAt(angle);
  }
}
