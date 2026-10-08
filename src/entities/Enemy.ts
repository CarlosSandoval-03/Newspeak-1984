import type p5 from "p5";
import type { Assets } from "../assets";
import {
  ALERT_FIRE_MULT,
  BOMBER_FAN_COUNT,
  BOMBER_FAN_SPREAD_DEGREES,
  BOMBER_FIRE_INTERVAL,
  CANVAS_HEIGHT,
  ENEMY_BULLET_SPEED,
  ENEMY_FIRE_INTERVAL,
  ENEMY_FIRE_JITTER,
  ENEMY_STATS,
  HIT_FLASH_FRAMES,
  HOMING_FRAMES,
  HOMING_TURN_RATE,
  SINE_AMPLITUDE,
  SINE_PERIOD,
  STEEL,
} from "../config";
import { state } from "../state";
import { ALERT, type EnemyKind, type Vec } from "../types";
import { Bullet } from "./Bullet";
import { Entity } from "./Entity";

const SPRITES = {
  straight: "enemy-fighter",
  sine: "enemy-fighter",
  bomber: "enemy-bomber",
  homing: "enemy-gyro",
} as const;

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

export class Enemy extends Entity {
  readonly kind: EnemyKind;
  readonly score: number;
  private hp: number;
  private readonly startX: number;
  private age = 0;
  private flash = 0;
  // Radians, with π/2 straight down the screen; only an autogyro ever turns.
  private heading = Math.PI / 2;
  private fireTimer: number;
  private readonly target: () => Vec;
  private readonly images: Assets["image"];
  private readonly fire: (bullet: Bullet) => void;

  constructor(
    kind: EnemyKind,
    pos: Vec,
    target: () => Vec,
    images: Assets["image"],
    fire: (bullet: Bullet) => void,
  ) {
    const stats = ENEMY_STATS[kind];
    super(pos, stats.radius);

    this.kind = kind;
    this.score = stats.score;
    this.hp = stats.hp;
    this.vel = { x: 0, y: stats.speed };
    this.startX = pos.x;
    this.target = target;
    this.images = images;
    this.fire = fire;
    this.fireTimer = this.nextFireDelay();
  }

  // True only for the hit that killed it, so two bullets landing on one tick score it once.
  hit(damage = 1): boolean {
    if (!this.alive) return false;

    this.hp -= damage;
    if (this.hp <= 0) {
      this.alive = false;
      return true;
    }

    this.flash = HIT_FLASH_FRAMES;
    return false;
  }

  update(): void {
    this.age++;
    if (this.kind === "homing") this.steer();
    super.update();
    if (this.kind === "sine")
      this.pos.x =
        this.startX +
        SINE_AMPLITUDE * Math.sin((this.age / SINE_PERIOD) * 2 * Math.PI);

    if (this.flash > 0) this.flash--;

    // Most enemies only fly down, so leaving means falling off the bottom; an autogyro can leave by any edge.
    const half = ENEMY_STATS[this.kind].halfSize;
    const gone =
      this.kind === "homing"
        ? this.isOffscreen(half)
        : this.pos.y - half > CANVAS_HEIGHT;
    if (gone) {
      this.alive = false;
      return;
    }

    // An autogyro's weapon is itself.
    if (this.kind === "homing") return;

    // The clock only runs on screen, so nothing shoots from beyond the top edge.
    if (this.pos.y < 0) return;
    if (--this.fireTimer > 0) return;

    this.fireTimer = this.nextFireDelay();
    if (this.kind === "bomber") this.fireFan();
    else this.fireAt(this.aim());
  }

  draw(p: p5): void {
    const sprite = SPRITES[this.kind];
    const body = this.flash > 0 ? (`${sprite}-flash` as const) : sprite;

    const turn = this.heading - Math.PI / 2;

    this.drawAircraft(
      p,
      this.images[body],
      this.images[`${sprite}-shadow`],
      turn,
    );
    if (this.kind === "homing") this.drawRotor(p, turn);
  }

  // Turns toward the player no faster than HOMING_TURN_RATE, so a sharp sidestep shakes it off.
  private steer(): void {
    if (this.age <= HOMING_FRAMES) {
      const target = this.target();
      const wanted = Math.atan2(target.y - this.pos.y, target.x - this.pos.x);
      const d = wanted - this.heading;
      const off = Math.atan2(Math.sin(d), Math.cos(d));
      this.heading +=
        Math.sign(off) * Math.min(Math.abs(off), HOMING_TURN_RATE);
    }

    const { speed } = ENEMY_STATS[this.kind];
    this.vel = {
      x: Math.cos(this.heading) * speed,
      y: Math.sin(this.heading) * speed,
    };
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
    return reloadDelay(
      this.kind === "bomber" ? BOMBER_FIRE_INTERVAL : ENEMY_FIRE_INTERVAL,
    );
  }

  private aim(): number {
    const target = this.target();
    return Math.atan2(target.y - this.pos.y, target.x - this.pos.x);
  }

  private fireAt(angle: number): void {
    const vel = {
      x: Math.cos(angle) * ENEMY_BULLET_SPEED,
      y: Math.sin(angle) * ENEMY_BULLET_SPEED,
    };
    this.fire(new Bullet("enemy", this.pos, vel));
  }

  private fireFan(): void {
    const spread = (BOMBER_FAN_SPREAD_DEGREES * Math.PI) / 180;
    const first = this.aim() - spread / 2;
    const step = spread / (BOMBER_FAN_COUNT - 1);

    for (let i = 0; i < BOMBER_FAN_COUNT; i++) this.fireAt(first + i * step);
  }
}
