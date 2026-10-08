import type p5 from "p5";
import { INK, SCROLL_SPEED } from "../config";
import type { Scene } from "../core/Scene";
import type { SceneManager } from "../core/SceneManager";
import type { Bullet } from "../entities/Bullet";
import { Enemy } from "../entities/Enemy";
import { Player } from "../entities/Player";
import { LEVELS } from "../levels/levels";
import { resetLevelState, state } from "../state";
import { Spawner } from "../systems/Spawner";

export class GameScene implements Scene {
  private readonly p: p5;
  private readonly player: Player;
  private readonly spawner: Spawner;
  private enemies: Enemy[] = [];
  private bullets: Bullet[] = [];
  private scroll = 0;

  constructor(p: p5, manager: SceneManager) {
    const { input, assets } = manager;
    const fire = (bullet: Bullet) => this.bullets.push(bullet);

    this.p = p;
    this.player = new Player(input, assets.image, fire);
    this.spawner = new Spawner(LEVELS[state.level - 1], (kind, pos) =>
      this.enemies.push(
        new Enemy(kind, pos, () => this.player.pos, assets.image, fire),
      ),
    );
  }

  enter(): void {
    resetLevelState();
  }

  update(): void {
    this.player.update();
    this.spawner.update(this.scroll);

    for (const enemy of this.enemies) enemy.update();
    for (const bullet of this.bullets) bullet.update();

    this.enemies = this.enemies.filter((enemy) => enemy.alive);
    this.bullets = this.bullets.filter((bullet) => bullet.alive);

    // Levels have no end yet, so a cleared level starts over.
    if (this.spawner.done && this.enemies.length === 0) {
      this.scroll = 0;
      this.spawner.reset();
    } else {
      this.scroll += SCROLL_SPEED;
    }
  }

  draw(): void {
    const { p } = this;

    p.background(INK);
    for (const enemy of this.enemies) enemy.draw(p);
    for (const bullet of this.bullets) bullet.draw(p);
    this.player.draw(p);
  }

  exit(): void {}
}
