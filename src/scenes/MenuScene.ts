import type p5 from "p5";
import { INK } from "../config";
import type { Scene } from "../core/Scene";

export class MenuScene implements Scene {
  private readonly p: p5;

  constructor(p: p5) {
    this.p = p;
  }

  enter(): void {}

  update(): void {}

  draw(): void {
    this.p.background(INK);
  }

  exit(): void {}
}
