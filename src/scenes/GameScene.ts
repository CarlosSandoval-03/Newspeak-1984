import type p5 from "p5";
import {
  AIRFIELD_AT,
  BOMB_BOSS_DAMAGE,
  BOMB_FLASH_ALPHA,
  BOMB_FLASH_FRAMES,
  BOSS_STATS,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  CELL_SIZE,
  ENEMY_STATS,
  EYE_DESTROYED_SUSPICION,
  EYE_STATS,
  DESCENT_DISTANCE,
  GAME_OVER_DELAY,
  LANDING_ACCEL,
  LANDING_HOLD_FRAMES,
  LANDING_LEAD,
  LANDING_SPEED,
  LIFTOFF_FRAMES,
  PAPER,
  PLAYER_HALF_SIZE,
  PLAYER_SPAWN,
  THOUGHT_POLICE_STATS,
  TURRET_STATS,
  RED,
  SCROLL_SPEED,
  TAKEOFF_RAMP_FRAMES,
} from "../config";
import { circlesOverlap } from "../core/Collisions";
import type { Scene } from "../core/Scene";
import type { SceneManager } from "../core/SceneManager";
import { LevelBoss } from "../entities/Boss";
import type { Bullet } from "../entities/Bullet";
import type { Arena } from "../entities/Entity";
import { Enemy } from "../entities/Enemy";
import { Explosion } from "../entities/Explosion";
import { Diary } from "../entities/Diary";
import { Eye } from "../entities/Eye";
import { Pickup } from "../entities/Pickup";
import { Player } from "../entities/Player";
import { ThoughtPolice } from "../entities/ThoughtPolice";
import { Turret } from "../entities/Turret";
import { Background } from "../levels/Background";
import { streetColumns } from "../levels/layout";
import { currentStrings } from "../i18n";
import { LEVELS } from "../levels/levels";
import { record, resetLevelState, state } from "../state";
import { Newspeak } from "../systems/Newspeak";
import { Propaganda } from "../systems/Propaganda";
import { Spawner } from "../systems/Spawner";
import { Suspicion } from "../systems/Suspicion";
import { ALERT, type LevelDef } from "../types";
import { Vignette } from "../ui/effects";
import { HUD } from "../ui/HUD";
import { DictionaryScene } from "./DictionaryScene";
import { GameOverScene } from "./GameOverScene";
import { MenuScene } from "./MenuScene";

export class GameScene implements Scene {
  private readonly p: p5;
  private readonly manager: SceneManager;
  private readonly level: LevelDef;
  private readonly player: Player;
  private readonly spawner: Spawner;
  private readonly hud: HUD;
  private readonly background: Background;
  private readonly suspicion = new Suspicion();
  private readonly newspeak = new Newspeak(this.suspicion);
  private readonly vignette: Vignette;
  private readonly arena: Arena;
  private readonly font: p5.Font;
  private enemies: Enemy[] = [];
  private eyes: Eye[] = [];
  private turrets: Turret[] = [];
  private police: ThoughtPolice | null = null;
  private boss: LevelBoss | null = null;
  private bossDown = false;
  private bullets: Bullet[] = [];
  private explosions: Explosion[] = [];
  private pickups: Pickup[] = [];
  private diary: Diary | null = null;
  // Parked on the start platform's eye.
  private scroll = AIRFIELD_AT + PLAYER_SPAWN.y;
  private speed = 0;
  private takeoffFrames = 0;
  private liftoffFrames = 0;
  // Until then, and again once landing, the plane flies itself and nothing can touch it.
  private flying = false;
  private landing = false;
  private landedFrames = 0;
  private gameOverIn = 0;
  private flash = 0;

  constructor(p: p5, manager: SceneManager) {
    const { input, assets } = manager;
    const level = LEVELS[state.level - 1];
    // The guns fall silent while the plane flies itself.
    const fire = (bullet: Bullet) => {
      if (this.flying) this.bullets.push(bullet);
    };

    this.p = p;
    this.manager = manager;
    this.level = level;
    this.arena = {
      images: assets.image,
      fire,
      target: () => this.player.pos,
    };
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
    this.background = new Background(p, level, assets);
    this.player = new Player(input, assets.image, fire);
    this.player.altitude = 0;
    this.spawner = new Spawner(level, {
      enemy: (kind, pos, { drops, camo }) => {
        const enemy = new Enemy(kind, pos, this.arena);
        enemy.drops = drops;
        enemy.camo = camo;
        this.enemies.push(enemy);
      },
      eye: (def, pos) => this.eyes.push(new Eye(def, pos, assets.image)),
      turret: (pos) => this.turrets.push(new Turret(pos, this.arena)),
      pickup: (word, pos) =>
        this.pickups.push(new Pickup(word, pos, assets.font.machine)),
      diary: (pos) => (this.diary = new Diary(pos, assets.image)),
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

    // The city stops at the level's length, for whatever is left of the fight.
    if (this.landing) this.land();
    else if (!this.flying) this.takeOff();
    else if (this.scroll >= this.level.length) this.speed = 0;
    if (this.flying && this.player.alive) this.player.update();
    if (this.flash > 0) this.flash--;
    if (
      this.flying &&
      this.player.alive &&
      state.bombs > 0 &&
      this.manager.input.wasPressed("bomb")
    )
      this.bomb();
    this.newspeak.update();
    if (
      this.flying &&
      this.player.alive &&
      this.manager.input.wasPressed("truth")
    )
      this.newspeak.revealTruth();
    if (this.scroll < this.level.length)
      this.spawner.update(
        this.scroll,
        state.alertLevel,
        this.police?.holding ?? false,
      );

    // Ground things ride the city, which stops and starts again to land.
    for (const ground of [
      ...this.turrets,
      ...this.eyes.filter((eye) => eye.type === "tower"),
      ...(this.diary ? [this.diary] : []),
    ])
      ground.vel.y = this.speed;

    for (const enemy of this.enemies) {
      enemy.update();
      enemy.revealed = this.newspeak.truthActive;
    }
    this.police?.update();
    this.boss?.update();
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
    if (this.boss && !this.boss.alive) {
      this.boss = null;
      this.bossDown = true;
    }
    // Never once the city has stopped: the end of a level belongs to its boss.
    const end = this.scroll >= this.level.length;
    if (!this.police && !end && state.alertLevel === ALERT.thoughtPolice)
      this.summonPolice();

    // The boss waits for the Thought Police to go; the landing, for the boss and the last enemy.
    if (this.flying && end && !this.police) {
      if (!this.boss && !this.bossDown) this.summonBoss();
      if (this.bossDown && this.player.alive && this.enemies.length === 0)
        this.startLanding();
    }
    this.scroll += this.speed;
  }

  draw(): void {
    const { p } = this;

    this.background.draw(this.scroll);
    this.diary?.draw(p);
    for (const turret of this.turrets) turret.draw(p);
    if (this.boss?.def.ground) this.boss.draw(p);
    for (const eye of this.eyes) eye.draw(p);
    for (const enemy of this.enemies) enemy.draw(p);
    this.police?.draw(p);
    if (this.boss && !this.boss.def.ground) this.boss.draw(p);
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
    const { police, boss } = this;
    this.hud.draw(
      police
        ? { health: police.health, regime: true }
        : boss
          ? { health: boss.health, regime: boss.def.regime }
          : null,
    );
  }

  exit(): void {}

  // The runway rolls under the parked plane, and once the lift-off line has passed beneath it,
  // the plane climbs; the pilot only takes the stick in the air.
  private takeOff(): void {
    const { park, liftoff } = this.manager.assets.platform;

    this.takeoffFrames++;
    this.speed =
      SCROLL_SPEED * Math.min(1, this.takeoffFrames / TAKEOFF_RAMP_FRAMES);

    const plane = this.scroll - PLAYER_SPAWN.y;
    if (plane < AIRFIELD_AT + park.y - liftoff.y) return;

    const t = ++this.liftoffFrames / LIFTOFF_FRAMES;
    this.player.altitude = t * t * (3 - 2 * t);
    this.flying = this.liftoffFrames === LIFTOFF_FRAMES;
  }

  private startLanding(): void {
    this.flying = false;
    this.landing = true;
    for (const bullet of this.bullets)
      if (bullet.owner !== "player") bullet.alive = false;
  }

  // The city comes in fast, then brakes evenly so the landing platform's eye stops under the plane,
  // which lines up with the runway and comes down to touch it at the touchdown line.
  private land(): void {
    const { park, touchdown } = this.manager.assets.platform;
    const parked = this.level.length + LANDING_LEAD + PLAYER_SPAWN.y;
    const left = parked - this.scroll;

    this.speed = Math.min(
      this.speed + LANDING_ACCEL,
      LANDING_SPEED,
      Math.sqrt(2 * LANDING_ACCEL * left),
      left,
    );
    const t = Math.min(
      1,
      Math.max(0, (left - (touchdown.y - park.y)) / DESCENT_DISTANCE),
    );
    this.player.altitude = t * t * (3 - 2 * t);
    this.player.autopilot(PLAYER_SPAWN);

    if (left > 0.01) return;
    this.scroll = parked;
    this.speed = 0;
    if (++this.landedFrames < LANDING_HOLD_FRAMES) return;

    // The last level has no next one until the endings exist, so the run goes back to the Menu.
    if (state.level < LEVELS.length) {
      state.level++;
      this.manager.change(new DictionaryScene(this.p, this.manager));
    } else this.manager.change(new MenuScene(this.p, this.manager));
  }

  // Clears what is on screen: every enemy aircraft, each one a kill, and every shot but the pilot's;
  // the Thought Police and the bosses only take a heavy blow. Enemies still above the top edge come through, and the
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

    const { police, boss } = this;
    if (
      police &&
      !police.isOffscreen(THOUGHT_POLICE_STATS.halfSize) &&
      police.hit(BOMB_BOSS_DAMAGE)
    )
      this.kill(police);
    if (
      boss &&
      !boss.isOffscreen(boss.def.halfSize) &&
      boss.hit(BOMB_BOSS_DAMAGE)
    )
      this.kill(boss);
  }

  // A ground boss rides the vertical street nearest the middle of the screen.
  private summonBoss(): void {
    const { boss: kind, terrain } = this.level;
    const middle = CANVAS_WIDTH / 2;
    const x = BOSS_STATS[kind].ground
      ? streetColumns(terrain.seed)
          .map((column) => (column + 0.5) * CELL_SIZE)
          .reduce((best, x) =>
            Math.abs(x - middle) < Math.abs(best - middle) ? x : best,
          )
      : middle;

    this.boss = new LevelBoss(kind, x, this.arena);
  }

  // Suspicion stays at the top while they hold the sky, so they come once until they're gone.
  private summonPolice(): void {
    const police = new ThoughtPolice(this.arena);

    this.police = police;
    for (const side of [-1, 1] as const)
      this.enemies.push(
        new Enemy("escort", police.pos, this.arena, { leader: police, side }),
      );
  }

  // A dead pilot can't be seen, so the cones go quiet during the crash, and while the regime flies the plane.
  private watch(): void {
    const { player } = this;

    for (const eye of this.eyes)
      eye.detecting = this.flying && player.alive && eye.sees(player.pos);
    const seenBy = this.eyes.filter((eye) => eye.detecting);

    this.suspicion.update(seenBy, player.pos);
    this.vignette.update(seenBy.length > 0);
  }

  private collide(): void {
    const { player } = this;
    const targets = [
      ...this.enemies,
      ...(this.police ? [this.police] : []),
      ...(this.boss ? [this.boss] : []),
      ...this.turrets,
      ...this.eyes,
    ];
    // Re-checked on every pair: a hit earlier in the same tick changes it.
    const exposed = () =>
      this.flying && player.alive && !player.invulnerable;

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

    // Ramming the Thought Police or an air boss costs a life and leaves them flying.
    for (const giant of [this.police, this.boss])
      if (
        giant?.alive &&
        !(giant instanceof LevelBoss && giant.def.ground) &&
        exposed() &&
        circlesOverlap(giant, player)
      )
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

  private kill(target: Enemy | Turret | ThoughtPolice | LevelBoss): void {
    state.realScore += target.score;
    record("kills");
    if (target instanceof LevelBoss)
      this.explosions.push(
        new Explosion(
          target.pos,
          target.def.halfSize * 2,
          target.def.regime ? RED : PAPER,
        ),
      );
    else if (target instanceof ThoughtPolice)
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
