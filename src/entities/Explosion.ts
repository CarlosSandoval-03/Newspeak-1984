import type p5 from "p5";
import { EXPLOSION_FRAMES, EXPLOSION_PARTICLES, PAPER } from "../config";
import type { Vec } from "../types";
import { Entity } from "./Entity";

type Puff = { x: number; y: number; size: number };
type Particle = { x: number; y: number; vx: number; vy: number };

// No hitbox: it only shows where something died, and stays there because aircraft fly above the ground.
export class Explosion extends Entity {
  private age = 0;
  private readonly color: string;
  private readonly puffs: Puff[];
  private readonly particles: Particle[];

  constructor(pos: Vec, size: number, color = PAPER) {
    super(pos, 0);
    this.color = color;

    const spot = () => (Math.random() - 0.5) * size * 0.5;
    this.puffs = Array.from({ length: 3 }, (_, i) => ({
      x: i === 0 ? 0 : spot(),
      y: i === 0 ? 0 : spot(),
      size: size * (i === 0 ? 1 : 0.6),
    }));

    this.particles = Array.from({ length: EXPLOSION_PARTICLES }, () => {
      const angle = Math.random() * 2 * Math.PI;
      const speed = 1 + Math.random() * 2;
      return {
        x: 0,
        y: 0,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
      };
    });
  }

  update(): void {
    this.age++;
    for (const particle of this.particles) {
      particle.x += particle.vx;
      particle.y += particle.vy;
    }

    if (this.age >= EXPLOSION_FRAMES) this.alive = false;
  }

  draw(p: p5): void {
    const progress = this.age / EXPLOSION_FRAMES;
    const x = Math.round(this.pos.x);
    const y = Math.round(this.pos.y);
    const context = p.drawingContext as CanvasRenderingContext2D;

    context.globalAlpha = 1 - progress;
    p.noStroke();
    p.fill(this.color);

    for (const puff of this.puffs)
      p.circle(x + puff.x, y + puff.y, puff.size * progress);
    for (const particle of this.particles)
      p.rect(Math.round(x + particle.x), Math.round(y + particle.y), 2, 2);

    context.globalAlpha = 1;
  }
}
