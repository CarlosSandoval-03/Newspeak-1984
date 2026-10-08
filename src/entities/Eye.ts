import type p5 from "p5";
import type { Assets } from "../assets";
import {
  CANVAS_HEIGHT,
  CONE_EDGE_ALPHA,
  CONE_FILL_ALPHA,
  DRONE_PATROL_PERIOD,
  DRONE_PATROL_REACH,
  DRONE_SPEED,
  EYE_APERTURE_DEGREES,
  EYE_STATS,
  HIT_FLASH_FRAMES,
  INK,
  PAPER,
  RED,
  SCROLL_SPEED,
  SHADOW_ALPHA,
  SHADOW_OFFSET,
  STEEL,
} from "../config";
import type { EyeDef, EyeType, Vec } from "../types";
import { Entity } from "./Entity";

const DRONE_BODY = 12;
const DRONE_LENS = 4;
// Each rotor sits this far out on a diagonal and spins as a line this long.
const ROTOR_REACH = 8;
const ROTOR_LENGTH = 8;
const ROTOR_SPIN = 0.5;

const radians = (degrees: number) => (degrees * Math.PI) / 180;

export class Eye extends Entity {
  readonly type: EyeType;
  readonly range: number;
  // Set from outside each tick, since only the scene knows whether the player can be seen at all.
  detecting = false;
  private hp: number;
  private age = 0;
  private flash = 0;
  private readonly facing: number;
  private readonly sweepAmp: number;
  private readonly sweepSpeed: number;
  private readonly aperture: number;
  // Keeps eyes placed side by side from sweeping in step.
  private readonly phase = Math.random() * 2 * Math.PI;
  private readonly startX: number;
  private readonly path: "patrol" | "sine" | null;
  private readonly images: Assets["image"];

  constructor(def: EyeDef, pos: Vec, images: Assets["image"]) {
    const stats = EYE_STATS[def.type];
    super(pos, stats.radius);

    this.type = def.type;
    this.range = def.range;
    this.hp = stats.hp;
    this.facing = radians(def.facing);
    this.sweepAmp = radians(def.sweepAmp);
    this.sweepSpeed = def.sweepSpeed;
    this.aperture = radians(def.aperture ?? EYE_APERTURE_DEGREES);
    this.vel = { x: 0, y: def.type === "tower" ? SCROLL_SPEED : DRONE_SPEED };
    this.startX = pos.x;
    this.path = def.type === "drone" ? def.path : null;
    this.images = images;
  }

  get angle(): number {
    return (
      this.facing +
      this.sweepAmp * Math.sin(this.age * this.sweepSpeed + this.phase)
    );
  }

  // Walls don't block the view: the Party sees through everything.
  sees(point: Vec): boolean {
    const dx = point.x - this.pos.x;
    const dy = point.y - this.pos.y;
    if (dx * dx + dy * dy >= this.range * this.range) return false;

    // Wrapped into (-π, π], so a cone pointing left still sees across the ±180° seam.
    const d = Math.atan2(dy, dx) - this.angle;
    return Math.abs(Math.atan2(Math.sin(d), Math.cos(d))) < this.aperture / 2;
  }

  // True only for the hit that destroyed it, so two bullets on one tick count it once.
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

    const t = this.age / DRONE_PATROL_PERIOD;
    // A triangle wave flies the patrol at an even speed, turning sharply at each end.
    if (this.path === "patrol")
      this.pos.x =
        this.startX +
        DRONE_PATROL_REACH *
          (2 / Math.PI) *
          Math.asin(Math.sin(2 * Math.PI * t));
    if (this.path === "sine")
      this.pos.x = this.startX + DRONE_PATROL_REACH * Math.sin(2 * Math.PI * t);

    if (this.flash > 0) this.flash--;

    if (this.pos.y - EYE_STATS[this.type].halfSize > CANVAS_HEIGHT)
      this.alive = false;
  }

  draw(p: p5): void {
    this.drawCone(p);
    if (this.type === "tower") this.drawTower(p);
    else this.drawDrone(p);
  }

  // Under the eye itself, from the lens at its center.
  private drawCone(p: p5): void {
    const context = p.drawingContext as CanvasRenderingContext2D;
    const color = this.detecting ? RED : STEEL;
    const x = Math.round(this.pos.x);
    const y = Math.round(this.pos.y);
    const size = this.range * 2;
    const from = this.angle - this.aperture / 2;
    const to = this.angle + this.aperture / 2;

    context.globalAlpha = CONE_FILL_ALPHA;
    p.noStroke();
    p.fill(color);
    p.arc(x, y, size, size, from, to, p.PIE);

    context.globalAlpha = CONE_EDGE_ALPHA;
    p.noFill();
    p.stroke(color);
    p.strokeWeight(1);
    p.arc(x, y, size, size, from, to, p.PIE);

    context.globalAlpha = 1;
    p.noStroke();
  }

  private drawTower(p: p5): void {
    const sprite = this.flash > 0 ? "eye-tower-flash" : "eye-tower";

    p.imageMode(p.CENTER);
    p.image(
      this.images[sprite],
      Math.round(this.pos.x),
      Math.round(this.pos.y),
    );
  }

  // Drawn in code: a grey hub with a red lens, and a rotor spinning at each diagonal.
  private drawDrone(p: p5): void {
    const context = p.drawingContext as CanvasRenderingContext2D;
    const x = Math.round(this.pos.x);
    const y = Math.round(this.pos.y);

    context.globalAlpha = SHADOW_ALPHA;
    p.fill(INK);
    p.circle(x + SHADOW_OFFSET.x, y + SHADOW_OFFSET.y, DRONE_BODY);
    context.globalAlpha = 1;

    p.stroke(STEEL);
    p.strokeWeight(1);
    const spin = this.age * ROTOR_SPIN;
    for (let arm = 0; arm < 4; arm++) {
      const out = Math.PI / 4 + (arm * Math.PI) / 2;
      const cx = x + Math.cos(out) * ROTOR_REACH;
      const cy = y + Math.sin(out) * ROTOR_REACH;
      const dx = (Math.cos(spin) * ROTOR_LENGTH) / 2;
      const dy = (Math.sin(spin) * ROTOR_LENGTH) / 2;
      p.line(cx - dx, cy - dy, cx + dx, cy + dy);
    }

    p.stroke(INK);
    p.fill(this.flash > 0 ? PAPER : STEEL);
    p.circle(x, y, DRONE_BODY);
    p.noStroke();
    p.fill(RED);
    p.circle(x, y, DRONE_LENS);
  }
}
