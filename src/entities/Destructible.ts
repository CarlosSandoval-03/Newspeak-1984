import { HIT_FLASH_FRAMES } from "../config";
import type { Vec } from "../types";
import { Entity } from "./Entity";

// Anything the pilot can shoot down: it takes hits, flashes at one that doesn't destroy it,
// and owns up to the one that does.
export abstract class Destructible extends Entity {
  private readonly maxHp: number;
  private hp: number;
  protected flash = 0;

  constructor(pos: Vec, radius: number, hp: number) {
    super(pos, radius);
    this.maxHp = hp;
    this.hp = hp;
  }

  // From 1 down to 0, as an hp bar shows it.
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
    super.update();
    if (this.flash > 0) this.flash--;
  }
}
