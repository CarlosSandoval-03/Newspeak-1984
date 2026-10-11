import type p5 from "p5";
import type { Assets } from "../assets";
import {
  BLINK_FRAMES,
  CANVAS_WIDTH,
  DASH_FRAMES,
  DASH_INVULN_FRAMES,
  DASH_SPEED,
  ESCAPE_COOLDOWN_FRAMES,
  FREE_SPREAD_DEGREES,
  PLAYER_BULLET_SPEED,
  PLAYER_FIRE_COOLDOWN,
  PLAYER_HALF_SIZE,
  PLAYER_RADIUS,
  PLAYER_SPAWN,
  PLAYER_SPEED,
  PLAYFIELD_BOTTOM,
  RESPAWN_INVULN_FRAMES,
} from "../config";
import type { Input } from "../core/Input";
import { state } from "../state";
import type { Vec } from "../types";
import { Bullet } from "./Bullet";
import { Entity } from "./Entity";

// Fading copies left behind along a dash, so it reads as speed rather than a jump.
const DASH_GHOSTS = 3;
const GHOST_ALPHA = 0.35;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export class Player extends Entity {
  private readonly input: Input;
  private readonly images: Assets["image"];
  // The scene owns the bullets; the player only hands them over.
  private readonly fire: (bullet: Bullet) => void;
  private cooldown = 0;
  private bank = 0;
  private invulnFrames = 0;
  private dashFrames = 0;
  private dashGuard = 0;
  private dashCooldown = 0;
  private dashDir: Vec = { x: 0, y: -1 };
  private trail: Vec[] = [];
  altitude = 1;

  constructor(
    input: Input,
    images: Assets["image"],
    fire: (bullet: Bullet) => void,
  ) {
    super(PLAYER_SPAWN, PLAYER_RADIUS);
    this.input = input;
    this.images = images;
    this.fire = fire;
  }

  get dashReady(): boolean {
    return this.dashCooldown === 0;
  }

  get invulnerable(): boolean {
    return this.invulnFrames > 0 || this.dashGuard > 0;
  }

  respawn(): void {
    this.pos = { ...PLAYER_SPAWN };
    this.invulnFrames = RESPAWN_INVULN_FRAMES;
    this.dashFrames = 0;
    this.dashGuard = 0;
    this.trail = [];
  }

  update(): void {
    const { input } = this;
    const dx = Number(input.isDown("right")) - Number(input.isDown("left"));
    const dy = Number(input.isDown("down")) - Number(input.isDown("up"));

    if (this.dashCooldown > 0) this.dashCooldown--;
    if (input.wasPressed("dash")) this.dash(dx, dy);

    if (this.dashFrames > 0) {
      this.dashFrames--;
      this.trail = [{ ...this.pos }, ...this.trail].slice(0, DASH_GHOSTS);
      this.vel = {
        x: this.dashDir.x * DASH_SPEED,
        y: this.dashDir.y * DASH_SPEED,
      };
    } else {
      this.trail = [];
      // Without this, diagonals would be about 41% faster.
      const speed = dx && dy ? PLAYER_SPEED / Math.SQRT2 : PLAYER_SPEED;
      this.vel = { x: dx * speed, y: dy * speed };
    }
    this.bank = dx;
    super.update();

    this.pos.x = clamp(
      this.pos.x,
      PLAYER_HALF_SIZE,
      CANVAS_WIDTH - PLAYER_HALF_SIZE,
    );
    this.pos.y = clamp(
      this.pos.y,
      PLAYER_HALF_SIZE,
      PLAYFIELD_BOTTOM - PLAYER_HALF_SIZE,
    );

    if (this.invulnFrames > 0) this.invulnFrames--;
    if (this.dashGuard > 0) this.dashGuard--;
    if (this.cooldown > 0) this.cooldown--;
    if (input.isDown("shoot") && this.cooldown === 0) {
      this.volley();
      this.cooldown = PLAYER_FIRE_COOLDOWN;
    }
  }

  // The regime flies the plane: toward `target`, slowing as it nears it, banking into turns, never firing.
  autopilot(target: Vec): void {
    const dx = target.x - this.pos.x;
    const dy = target.y - this.pos.y;
    const distance = Math.hypot(dx, dy);
    const step = Math.min(distance, Math.max(distance / 16, 0.5), PLAYER_SPEED);

    this.vel = distance
      ? { x: (dx / distance) * step, y: (dy / distance) * step }
      : { x: 0, y: 0 };
    this.bank = Math.abs(this.vel.x) > 0.5 ? Math.sign(this.vel.x) : 0;
    this.dashFrames = 0;
    this.trail = [];
    // Still counted down, or a blink caught mid-way would hide the plane for good.
    if (this.invulnFrames > 0) this.invulnFrames--;
    super.update();
  }

  // Only an awake ESCAPE dashes, and its level, read at each dash, sets how soon the next one is ready.
  // With no direction held it goes forward, the one way that is always away from the bottom edge.
  private dash(dx: number, dy: number): void {
    const level = state.words.has("ESCAPE") ? state.wordLevels.ESCAPE : 0;
    if (level === 0 || this.dashCooldown > 0) return;

    const length = Math.hypot(dx, dy);
    this.dashDir = length
      ? { x: dx / length, y: dy / length }
      : { x: 0, y: -1 };
    this.dashFrames = DASH_FRAMES;
    this.dashGuard = DASH_INVULN_FRAMES;
    this.dashCooldown = ESCAPE_COOLDOWN_FRAMES[level - 1];
  }

  // Read at every shot, so losing or upgrading FREE changes the very next volley.
  private volley(): void {
    const nose = { x: this.pos.x, y: this.pos.y - PLAYER_HALF_SIZE };
    const spread =
      FREE_SPREAD_DEGREES[state.words.has("FREE") ? state.wordLevels.FREE : 0];

    for (const degrees of spread) {
      const angle = (degrees * Math.PI) / 180;
      this.fire(
        new Bullet("player", nose, {
          x: Math.sin(angle) * PLAYER_BULLET_SPEED,
          y: -Math.cos(angle) * PLAYER_BULLET_SPEED,
        }),
      );
    }
  }

  // Only a respawn blinks; a dash shows its cover with the trail instead.
  draw(p: p5): void {
    if (
      this.invulnFrames > 0 &&
      Math.floor(this.invulnFrames / BLINK_FRAMES) % 2
    )
      return;

    const name =
      this.bank < 0
        ? "player-bank-left"
        : this.bank > 0
          ? "player-bank-right"
          : "player";
    const context = p.drawingContext as CanvasRenderingContext2D;

    p.imageMode(p.CENTER);
    this.trail.forEach((ghost, i) => {
      context.globalAlpha = GHOST_ALPHA * (1 - i / DASH_GHOSTS);
      p.image(this.images[name], Math.round(ghost.x), Math.round(ghost.y));
    });
    context.globalAlpha = 1;

    this.drawAircraft(
      p,
      this.images[name],
      this.images[`${name}-shadow`],
      0,
      1,
      this.altitude,
    );
  }
}
