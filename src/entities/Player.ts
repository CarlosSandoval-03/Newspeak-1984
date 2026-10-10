import type p5 from "p5";
import type { Assets } from "../assets";
import {
  BLINK_FRAMES,
  CANVAS_WIDTH,
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
import { Bullet } from "./Bullet";
import { Entity } from "./Entity";

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

  get invulnerable(): boolean {
    return this.invulnFrames > 0;
  }

  respawn(): void {
    this.pos = { ...PLAYER_SPAWN };
    this.invulnFrames = RESPAWN_INVULN_FRAMES;
  }

  update(): void {
    const { input } = this;
    const dx = Number(input.isDown("right")) - Number(input.isDown("left"));
    const dy = Number(input.isDown("down")) - Number(input.isDown("up"));

    // Without this, diagonals would be about 41% faster.
    const speed = dx && dy ? PLAYER_SPEED / Math.SQRT2 : PLAYER_SPEED;
    this.vel = { x: dx * speed, y: dy * speed };
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
    if (this.cooldown > 0) this.cooldown--;
    if (input.isDown("shoot") && this.cooldown === 0) {
      this.volley();
      this.cooldown = PLAYER_FIRE_COOLDOWN;
    }
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

  draw(p: p5): void {
    if (this.invulnerable && Math.floor(this.invulnFrames / BLINK_FRAMES) % 2)
      return;

    const name =
      this.bank < 0
        ? "player-bank-left"
        : this.bank > 0
          ? "player-bank-right"
          : "player";

    this.drawAircraft(p, this.images[name], this.images[`${name}-shadow`]);
  }
}
