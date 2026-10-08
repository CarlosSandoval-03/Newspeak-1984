import type p5 from "p5";
import { ENEMY_STATS, INK, PLAYER_HALF_SIZE, SCROLL_SPEED } from "../config";
import { circlesOverlap } from "../core/Collisions";
import type { Scene } from "../core/Scene";
import type { SceneManager } from "../core/SceneManager";
import type { Bullet } from "../entities/Bullet";
import { Enemy } from "../entities/Enemy";
import { Explosion } from "../entities/Explosion";
import { Player } from "../entities/Player";
import { LEVELS } from "../levels/levels";
import { resetLevelState, state } from "../state";
import { Spawner } from "../systems/Spawner";
import { MenuScene } from "./MenuScene";

export class GameScene implements Scene {
  private readonly p: p5;
  private readonly manager: SceneManager;
  private readonly player: Player;
  private readonly spawner: Spawner;
  private enemies: Enemy[] = [];
  private bullets: Bullet[] = [];
  private explosions: Explosion[] = [];
  private scroll = 0;

  constructor(p: p5, manager: SceneManager) {
    const { input, assets } = manager;
    const fire = (bullet: Bullet) => this.bullets.push(bullet);

    this.p = p;
    this.manager = manager;
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
    for (const explosion of this.explosions) explosion.update();

    this.collide();

    this.enemies = this.enemies.filter((enemy) => enemy.alive);
    this.bullets = this.bullets.filter((bullet) => bullet.alive);
    this.explosions = this.explosions.filter((explosion) => explosion.alive);

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
    for (const explosion of this.explosions) explosion.draw(p);
  }

  exit(): void {}

  private collide(): void {
    const { player } = this;

    for (const bullet of this.bullets) {
      if (!bullet.alive) continue;

      if (bullet.owner === "player") {
        const enemy = this.enemies.find(
          (enemy) => enemy.alive && circlesOverlap(bullet, enemy),
        );
        if (!enemy) continue;

        bullet.alive = false;
        if (enemy.hit()) this.kill(enemy);
      } else if (!player.invulnerable && circlesOverlap(bullet, player)) {
        bullet.alive = false;
        this.hitPlayer();
      }
    }

    // A crash destroys the enemy too, but scores nothing: it isn't a kill.
    for (const enemy of this.enemies) {
      if (!enemy.alive || player.invulnerable) continue;
      if (!circlesOverlap(enemy, player)) continue;

      enemy.alive = false;
      this.explode(enemy);
      this.hitPlayer();
    }
  }

  private kill(enemy: Enemy): void {
    state.realScore += enemy.score;
    state.stats.kills++;
    this.explode(enemy);
  }

  private explode(enemy: Enemy): void {
    const size = ENEMY_STATS[enemy.kind].halfSize * 2;
    this.explosions.push(new Explosion(enemy.pos, size));
  }

  private hitPlayer(): void {
    const { player } = this;

    this.explosions.push(new Explosion(player.pos, PLAYER_HALF_SIZE * 2));
    state.realLives--;

    // Respawning first makes the player invulnerable, so a second hit on the same tick can't count.
    player.respawn();
    if (state.realLives <= 0)
      this.manager.change(new MenuScene(this.p, this.manager));
  }
}
