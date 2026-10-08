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
  SINE_AMPLITUDE,
  SINE_PERIOD,
} from "../config";
import { state } from "../state";
import { ALERT, type EnemyKind, type Vec } from "../types";
import { Bullet } from "./Bullet";
import { Entity } from "./Entity";

const SPRITES = {
  straight: "enemy-fighter",
  sine: "enemy-fighter",
  bomber: "enemy-bomber",
} as const;

export class Enemy extends Entity {
  readonly kind: EnemyKind;
  readonly score: number;
  private hp: number;
  private readonly startX: number;
  private age = 0;
  private flash = 0;
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
    super.update();
    if (this.kind === "sine")
      this.pos.x =
        this.startX +
        SINE_AMPLITUDE * Math.sin((this.age / SINE_PERIOD) * 2 * Math.PI);

    if (this.flash > 0) this.flash--;

    // Enemies only ever fly down, so leaving means falling off the bottom.
    if (this.pos.y - ENEMY_STATS[this.kind].halfSize > CANVAS_HEIGHT) {
      this.alive = false;
      return;
    }

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

    this.drawAircraft(p, this.images[body], this.images[`${sprite}-shadow`]);
  }

  // Read at every reload, so enemies already on screen speed up from their next shot.
  private nextFireDelay(): number {
    const base =
      this.kind === "bomber" ? BOMBER_FIRE_INTERVAL : ENEMY_FIRE_INTERVAL;
    const interval =
      state.alertLevel >= ALERT.alert ? base / ALERT_FIRE_MULT : base;
    return Math.round(interval + (Math.random() * 2 - 1) * ENEMY_FIRE_JITTER);
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
