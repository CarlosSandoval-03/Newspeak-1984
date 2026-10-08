import { HIT_FLASH_FRAMES } from "../config";
import type { Vec } from "../types";
import { Entity } from "./Entity";

// Shared by the Thought Police and, later, every level boss: hp, its bar, and the hit flash.
export abstract class Boss extends Entity {
  readonly score: number;
  private readonly maxHp: number;
  private hp: number;
  protected age = 0;
  protected flash = 0;

  constructor(pos: Vec, radius: number, hp: number, score: number) {
    super(pos, radius);
    this.maxHp = hp;
    this.hp = hp;
    this.score = score;
  }

  // What the hp bar shows, from 1 down to 0.
  get health(): number {
    return this.hp / this.maxHp;
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
    if (this.flash > 0) this.flash--;
  }
}
