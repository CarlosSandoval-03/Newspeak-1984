import type p5 from "p5";
import type { Assets } from "../assets";
import {
  BOMB_BOSS_DAMAGE,
  BOMB_FLASH_ALPHA,
  BOMB_FLASH_FRAMES,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  ENEMY_STATS,
  EYE_DESTROYED_SUSPICION,
  EYE_STATS,
  GAME_OVER_DELAY,
  PAPER,
  PLAYER_HALF_SIZE,
  THOUGHT_POLICE_STATS,
  TURRET_STATS,
  RED,
  SCROLL_SPEED,
} from "../config";
import { circlesOverlap } from "../core/Collisions";
import type { Scene } from "../core/Scene";
import type { SceneManager } from "../core/SceneManager";
import type { Bullet } from "../entities/Bullet";
import { Enemy } from "../entities/Enemy";
import { Explosion } from "../entities/Explosion";
import { Diary } from "../entities/Diary";
import { Eye } from "../entities/Eye";
import { Pickup } from "../entities/Pickup";
import { Player } from "../entities/Player";
import { ThoughtPolice } from "../entities/ThoughtPolice";
import { Turret } from "../entities/Turret";
import { Background } from "../levels/Background";
import { currentStrings } from "../i18n";
import { LEVELS } from "../levels/levels";
import { record, resetLevelState, state } from "../state";
import { Newspeak } from "../systems/Newspeak";
import { Propaganda } from "../systems/Propaganda";
import { Spawner } from "../systems/Spawner";
import { Suspicion } from "../systems/Suspicion";
import { ALERT } from "../types";
import { Vignette } from "../ui/effects";
import { HUD } from "../ui/HUD";
import { DictionaryScene } from "./DictionaryScene";
import { GameOverScene } from "./GameOverScene";

export class GameScene implements Scene {
  private readonly p: p5;
  private readonly manager: SceneManager;
  private readonly player: Player;
  private readonly spawner: Spawner;
  private readonly hud: HUD;
  private readonly background: Background;
  private readonly suspicion = new Suspicion();
  private readonly newspeak = new Newspeak(this.suspicion);
  private readonly vignette: Vignette;
  private readonly images: Assets["image"];
  private readonly fire: (bullet: Bullet) => void;
  private readonly font: p5.Font;
  private enemies: Enemy[] = [];
  private eyes: Eye[] = [];
  private turrets: Turret[] = [];
  private police: ThoughtPolice | null = null;
  private bullets: Bullet[] = [];
  private explosions: Explosion[] = [];
  private pickups: Pickup[] = [];
  private diary: Diary | null = null;
  private scroll = 0;
  private gameOverIn = 0;
  private flash = 0;

  constructor(p: p5, manager: SceneManager) {
    const { input, assets } = manager;
    const level = LEVELS[state.level - 1];
    const fire = (bullet: Bullet) => this.bullets.push(bullet);

    this.p = p;
    this.manager = manager;
    this.images = assets.image;
    this.fire = fire;
    this.font = assets.font.machine;
    this.hud = new HUD(
      p,
      assets.font,
      // Read at draw time, by when the pilot exists.
      new Propaganda({
        dashReady: () => this.player.dashReady,
        truthReady: () => this.newspeak.truthReady,
        truthLeft: () => this.newspeak.truthLeft,
      }),
    );
    this.vignette = new Vignette(p);
    this.background = new Background(p, level.terrain, assets);
    this.player = new Player(input, assets.image, fire);
    this.spawner = new Spawner(level, {
      enemy: (kind, pos, { drops, camo }) => {
        const enemy = new Enemy(
          kind,
          pos,
          () => this.player.pos,
          assets.image,
          fire,
        );
        enemy.drops = drops;
        enemy.camo = camo;
        this.enemies.push(enemy);
      },
      eye: (def, pos) => this.eyes.push(new Eye(def, pos, assets.image)),
      turret: (pos) =>
        this.turrets.push(
          new Turret(pos, () => this.player.pos, assets.image, fire),
        ),
      pickup: (word, pos) =>
        this.pickups.push(new Pickup(word, pos, assets.font.machine)),
      // One page a level: once read, a later pass of the waves lays no new one.
      diary: (pos) => {
        if (state.stats.diaries === 0)
          this.diary = new Diary(pos, assets.image);
      },
    });
  }

  // Words go first, so the bombs are refilled from what the level actually leaves.
  enter(): void {
    this.newspeak.applyLevel(state.level);
    resetLevelState();
  }

  update(): void {
    if (this.gameOverIn > 0 && --this.gameOverIn === 0) {
      // The canvas still holds the last frame drawn, which the telescreen switches off.
      this.manager.change(
        new GameOverScene(this.p, this.manager, this.p.get()),
      );
      return;
    }

    if (this.player.alive) this.player.update();
    if (this.flash > 0) this.flash--;
    if (
      this.player.alive &&
      state.bombs > 0 &&
      this.manager.input.wasPressed("bomb")
    )
      this.bomb();
    this.newspeak.update();
    if (this.player.alive && this.manager.input.wasPressed("truth"))
      this.newspeak.revealTruth();
    this.spawner.update(
      this.scroll,
      state.alertLevel,
      this.police?.holding ?? false,
    );

    for (const enemy of this.enemies) {
      enemy.update();
      enemy.revealed = this.newspeak.truthActive;
    }
    this.police?.update();
    for (const eye of this.eyes) eye.update();
    for (const turret of this.turrets) turret.update();
    for (const bullet of this.bullets) bullet.update();
    for (const explosion of this.explosions) explosion.update();
    for (const pickup of this.pickups) pickup.update();
    this.diary?.update();
    this.hud.update();

    this.collide();

    this.enemies = this.enemies.filter((enemy) => enemy.alive);
    this.eyes = this.eyes.filter((eye) => eye.alive);
    this.turrets = this.turrets.filter((turret) => turret.alive);
    this.bullets = this.bullets.filter((bullet) => bullet.alive);
    this.explosions = this.explosions.filter((explosion) => explosion.alive);
    this.pickups = this.pickups.filter((pickup) => pickup.alive);
    if (!this.diary?.alive) this.diary = null;

    this.watch();

    // Killed or outlasted, it's over either way; after watching, so suspicion ends the tick right at the reset.
    if (this.police && !this.police.alive) {
      this.police = null;
      this.suspicion.release();
    }
    if (!this.police && state.alertLevel === ALERT.thoughtPolice)
      this.summonPolice();

    // Levels have no end yet, so clearing one's waves leads to the next level's Dictionary, and the
    // last level starts its waves over while the city flies on. Never mid-fight with the Thought Police.
    if (this.spawner.done && this.enemies.length === 0 && !this.police) {
      if (state.level < LEVELS.length) {
        state.level++;
        this.manager.change(new DictionaryScene(this.p, this.manager));
        return;
      }
      this.spawner.restart(this.scroll);
    }
    this.scroll += SCROLL_SPEED;
  }

  draw(): void {
    const { p } = this;

    this.background.draw(this.scroll);
    this.diary?.draw(p);
    for (const turret of this.turrets) turret.draw(p);
    for (const eye of this.eyes) eye.draw(p);
    for (const enemy of this.enemies) enemy.draw(p);
    this.police?.draw(p);
    for (const pickup of this.pickups) pickup.draw(p);
    for (const bullet of this.bullets) bullet.draw(p);
    if (this.player.alive) this.player.draw(p);
    for (const explosion of this.explosions) explosion.draw(p);
    if (this.flash > 0) {
      const context = p.drawingContext as CanvasRenderingContext2D;
      context.globalAlpha = (BOMB_FLASH_ALPHA * this.flash) / BOMB_FLASH_FRAMES;
      p.noStroke();
      p.fill(PAPER);
      p.rect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      context.globalAlpha = 1;
    }
    this.vignette.draw();
    this.hud.draw(this.police?.health ?? null);
  }

  exit(): void {}

  // Clears what is on screen: every enemy aircraft, each one a kill, and every shot but the pilot's;
  // the Thought Police only take a heavy blow. Enemies still above the top edge come through, and the
  // ground is out of reach: towers, drones, and guns stand below the blast.
  private bomb(): void {
    state.bombs--;
    this.flash = BOMB_FLASH_FRAMES;

    for (const enemy of this.enemies)
      if (enemy.alive && !enemy.isOffscreen(ENEMY_STATS[enemy.kind].halfSize)) {
        enemy.alive = false;
        this.kill(enemy);
      }
    for (const bullet of this.bullets)
      if (bullet.owner !== "player") bullet.alive = false;

    const { police } = this;
    if (
      police &&
      !police.isOffscreen(THOUGHT_POLICE_STATS.halfSize) &&
      police.hit(BOMB_BOSS_DAMAGE)
    )
      this.kill(police);
  }

  // Suspicion stays at the top while they hold the sky, so they come once until they're gone.
  private summonPolice(): void {
    const police = new ThoughtPolice(
      () => this.player.pos,
      this.images,
      this.fire,
    );

    this.police = police;
    for (const side of [-1, 1] as const)
      this.enemies.push(
        new Enemy(
          "escort",
          police.pos,
          () => this.player.pos,
          this.images,
          this.fire,
          { leader: police, side },
        ),
      );
  }

  // A dead pilot can't be seen, so the cones go quiet during the crash.
  private watch(): void {
    const { player } = this;

    for (const eye of this.eyes)
      eye.detecting = player.alive && eye.sees(player.pos);
    const seenBy = this.eyes.filter((eye) => eye.detecting);

    this.suspicion.update(seenBy, player.pos);
    this.vignette.update(seenBy.length > 0);
  }

  private collide(): void {
    const { player } = this;
    const targets = [
      ...this.enemies,
      ...(this.police ? [this.police] : []),
      ...this.turrets,
      ...this.eyes,
    ];
    // Re-checked on every pair: a hit earlier in the same tick changes it.
    const exposed = () => player.alive && !player.invulnerable;

    for (const bullet of this.bullets) {
      if (!bullet.alive) continue;

      if (bullet.owner === "player") {
        const target = targets.find(
          (target) => target.alive && circlesOverlap(bullet, target),
        );
        if (!target) continue;

        bullet.alive = false;
        if (!target.hit()) continue;
        if (target instanceof Eye) this.blind(target);
        else this.kill(target);
      } else if (exposed() && circlesOverlap(bullet, player)) {
        bullet.alive = false;
        this.hitPlayer();
      }
    }

    // A crash destroys the enemy too, but scores nothing: it isn't a kill.
    // Turrets and eyes stay out of this: the plane flies over the ground.
    for (const enemy of this.enemies) {
      if (!enemy.alive || !exposed()) continue;
      if (!circlesOverlap(enemy, player)) continue;

      enemy.alive = false;
      this.explode(enemy);
      this.hitPlayer();
    }

    // Ramming the Thought Police costs a life and leaves them flying.
    const { police } = this;
    if (police?.alive && exposed() && circlesOverlap(police, player))
      this.hitPlayer();

    const { diary } = this;
    if (diary?.alive && player.alive && circlesOverlap(diary, player)) {
      diary.alive = false;
      this.newspeak.readDiary();
      this.hud.typeDiary(currentStrings().diary.pages[state.level - 1].line);
    }

    // Even while blinking: only a pilot who is down can't reach for a word.
    for (const pickup of this.pickups) {
      if (!player.alive || !circlesOverlap(pickup, player)) continue;
      pickup.alive = false;
      this.newspeak.collect(pickup.word);
    }
  }

  private kill(target: Enemy | Turret | ThoughtPolice): void {
    state.realScore += target.score;
    record("kills");
    if (target instanceof ThoughtPolice)
      this.explosions.push(
        new Explosion(target.pos, THOUGHT_POLICE_STATS.halfSize * 2, RED),
      );
    else if (target instanceof Turret)
      this.explosions.push(
        new Explosion(target.pos, TURRET_STATS.halfSize * 2),
      );
    else {
      this.explode(target);
      if (target.drops)
        this.pickups.push(new Pickup(target.drops, target.pos, this.font));
    }
  }

  // The regime notices at once, and its eyes burst in its own red.
  private blind(eye: Eye): void {
    this.suspicion.add(EYE_DESTROYED_SUSPICION);
    record("eyesDestroyed");
    this.explosions.push(
      new Explosion(eye.pos, EYE_STATS[eye.type].halfSize * 2, RED),
    );
  }

  private explode(enemy: Enemy): void {
    const size = ENEMY_STATS[enemy.kind].halfSize * 2;
    this.explosions.push(new Explosion(enemy.pos, size));
  }

  private hitPlayer(): void {
    const { player } = this;

    this.explosions.push(new Explosion(player.pos, PLAYER_HALF_SIZE * 2));
    state.realLives--;

    if (state.realLives > 0) {
      player.respawn();
      return;
    }

    player.alive = false;
    this.gameOverIn = GAME_OVER_DELAY;
  }
}
