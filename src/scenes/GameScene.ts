import type p5 from "p5";
import { INK } from "../config";
import type { Scene } from "../core/Scene";
import type { SceneManager } from "../core/SceneManager";
import type { Bullet } from "../entities/Bullet";
import { Player } from "../entities/Player";
import { resetLevelState } from "../state";

export class GameScene implements Scene {
  private readonly p: p5;
  private readonly player: Player;
  private bullets: Bullet[] = [];

  constructor(p: p5, manager: SceneManager) {
    this.p = p;
    this.player = new Player(manager.input, manager.assets.image, (bullet) =>
      this.bullets.push(bullet),
    );
  }

  enter(): void {
    resetLevelState();
  }

  update(): void {
    this.player.update();

    for (const bullet of this.bullets) bullet.update();
    this.bullets = this.bullets.filter((bullet) => bullet.alive);
  }

  draw(): void {
    const { p } = this;

    p.background(INK);
    for (const bullet of this.bullets) bullet.draw(p);
    this.player.draw(p);
  }

  exit(): void {}
}
