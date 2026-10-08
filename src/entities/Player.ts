import type p5 from "p5";
import type { Assets } from "../assets";
import {
  CANVAS_WIDTH,
  PLAYER_BULLET_SPEED,
  PLAYER_FIRE_COOLDOWN,
  PLAYER_HALF_SIZE,
  PLAYER_RADIUS,
  PLAYER_SPAWN,
  PLAYER_SPEED,
  PLAYFIELD_BOTTOM,
} from "../config";
import type { Input } from "../core/Input";
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

    if (this.cooldown > 0) this.cooldown--;
    if (input.isDown("shoot") && this.cooldown === 0) {
      const nose = { x: this.pos.x, y: this.pos.y - PLAYER_HALF_SIZE };
      this.fire(new Bullet("player", nose, { x: 0, y: -PLAYER_BULLET_SPEED }));
      this.cooldown = PLAYER_FIRE_COOLDOWN;
    }
  }

  draw(p: p5): void {
    const name =
      this.bank < 0
        ? "player-bank-left"
        : this.bank > 0
          ? "player-bank-right"
          : "player";

    this.drawAircraft(p, this.images[name], this.images[`${name}-shadow`]);
  }
}
