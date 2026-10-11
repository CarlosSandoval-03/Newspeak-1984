import type p5 from "p5";
import type { Assets } from "../assets";
import { DAMAGE_END } from "../config";
import type { BossKind, DamageMap } from "../types";

type Region = DamageMap["regions"][number];

// None at full hp, then one more each time the hp falls another share, until all show at DAMAGE_END.
export function regionsShown(regions: number, health: number): number {
  return Math.min(
    regions,
    Math.ceil((regions * (1 - health)) / (1 - DAMAGE_END)),
  );
}

// A boss's sprite, wrecked hole by hole: it starts as a copy of the clean sprite, and each region
// that comes due is repainted from the wrecked one, so the work happens only when a region appears.
export class BossDamage {
  private readonly p: p5;
  private readonly kind: BossKind;
  private readonly assets: Assets;
  private graphics: p5.Graphics | null = null;
  private shown = 0;

  constructor(p: p5, kind: BossKind, assets: Assets) {
    this.p = p;
    this.kind = kind;
    this.assets = assets;
  }

  sprite(health: number): p5.Graphics {
    const graphics = this.clean();
    const { regions } = this.assets.damage[`boss-${this.kind}-damage`];
    const due = regionsShown(regions.length, health);

    while (this.shown < due) this.reveal(graphics, regions[this.shown++]);
    return graphics;
  }

  remove(): void {
    this.graphics?.remove();
  }

  // Built once, on the boss's first frame.
  private clean(): p5.Graphics {
    if (this.graphics) return this.graphics;

    const sprite = this.assets.image[`boss-${this.kind}`];
    this.graphics = this.p.createGraphics(sprite.width, sprite.height);
    this.graphics.image(sprite, 0, 0);
    return this.graphics;
  }

  // Erased first, since the holes are transparent and painting alone would keep the clean pixels;
  // without noStroke the erase bleeds a pixel past the rect.
  private reveal(graphics: p5.Graphics, { x, y, w, h }: Region): void {
    const damaged = this.assets.image[`boss-${this.kind}-damaged`];

    graphics.noStroke();
    graphics.erase();
    graphics.rect(x, y, w, h);
    graphics.noErase();
    graphics.image(damaged, x, y, w, h, x, y, w, h);
  }
}
