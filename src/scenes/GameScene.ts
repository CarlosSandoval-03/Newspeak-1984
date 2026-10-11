import type p5 from "p5";
import type { Assets } from "../assets";
import {
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
  GAME_OVER_DELAY,
  PAPER,
  PLAYER_HALF_SIZE,
  RED,
  THOUGHT_POLICE_STATS,
  TURRET_STATS,
} from "../config";
import { circlesOverlap } from "../core/Collisions";
import type { Scene } from "../core/Scene";
import type { SceneManager } from "../core/SceneManager";
import { LevelBoss } from "../entities/Boss";
import { BossDamage } from "../entities/BossDamage";
import type { Bullet } from "../entities/Bullet";
import { Diary } from "../entities/Diary";
import { Enemy } from "../entities/Enemy";
import type { Arena } from "../entities/Entity";
import { Explosion } from "../entities/Explosion";
import { Eye } from "../entities/Eye";
import { Pickup } from "../entities/Pickup";
import { Player } from "../entities/Player";
import { ThoughtPolice } from "../entities/ThoughtPolice";
import { Turret } from "../entities/Turret";
import { currentStrings } from "../i18n";
import { Background } from "../levels/Background";
import { streetColumns } from "../levels/layout";
import { LEVELS } from "../levels/levels";
import { record, resetLevelState, state } from "../state";
import { Flight } from "../systems/Flight";
import { judgeLevel } from "../systems/Ministry";
import { Newspeak } from "../systems/Newspeak";
import { Propaganda } from "../systems/Propaganda";
import { Spawner } from "../systems/Spawner";
import { Suspicion } from "../systems/Suspicion";
import { ALERT, type LevelDef } from "../types";
import { Vignette } from "../ui/effects";
import { type BossBar, HUD } from "../ui/HUD";
import { DictionaryScene } from "./DictionaryScene";
import { GameOverScene } from "./GameOverScene";
import { MenuScene } from "./MenuScene";

type Kill = Enemy | Turret | ThoughtPolice | LevelBoss;

export class GameScene implements Scene {
  private readonly p: p5;
  private readonly manager: SceneManager;
  private readonly level: LevelDef;
  private readonly player: Player;
  private readonly flight: Flight;
  private readonly spawner: Spawner;
  private readonly hud: HUD;
  private readonly background: Background;
  private readonly suspicion = new Suspicion();
  private readonly newspeak = new Newspeak(this.suspicion);
  private readonly vignette: Vignette;
  private readonly arena: Arena;
  private readonly font: p5.Font;
  private readonly bossDamage: BossDamage;
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
  private gameOverIn = 0;
  private flash = 0;

  constructor(p: p5, manager: SceneManager) {
    const { input, assets } = manager;
    const level = LEVELS[state.level - 1];
    // The guns fall silent while the plane flies itself.
    const fire = (bullet: Bullet) => {
      if (this.flight.flying) this.bullets.push(bullet);
    };

    this.p = p;
    this.manager = manager;
    this.level = level;
    this.arena = { images: assets.image, fire, target: () => this.player.pos };
    this.font = assets.font.machine;
    this.hud = this.createHud(assets);
    this.vignette = new Vignette(p);
    this.background = new Background(p, level, assets);
    this.player = new Player(input, assets.image, fire);
    this.flight = new Flight(this.player, level, assets.platform);
    this.bossDamage = new BossDamage(p, level.boss, assets);
    this.spawner = this.createSpawner(assets);
  }

  // Words go first, so the bombs are refilled from what the level actually leaves.
  enter(): void {
    this.newspeak.applyLevel(state.level);
    resetLevelState();
  }

  // One tick of the level: the flight sets the city's speed, the pilot acts, everything moves and
  // meets, the regime watches and sends its forces, and the level ends once the plane has landed.
  update(): void {
    // The crash has played out: the telescreen switches the pilot off.
    if (this.gameOverIn > 0 && --this.gameOverIn === 0) {
      this.showGameOver();
      return;
    }

    // Takeoff, the pilot's stretch, or the landing; a finished landing ends the level.
    this.flight.update();
    if (this.flight.landed) {
      this.leaveLevel();
      return;
    }

    // The pilot's stick and words, then everything else in the world.
    this.act();
    this.spawn();
    this.moveAll();

    // Hits, crashes, and pickups, then the wreckage cleared away.
    this.collide();
    this.removeDead();

    // The regime's eyes, its Thought Police, and the level's boss; then the landing, once it is time.
    this.watch();
    this.updateRegime();
    if (this.readyToLand()) this.startLanding();

    this.flight.advance();
  }

  // The ground and what stands on it, then the sky over it, then the screen-wide effects and the HUD.
  draw(): void {
    this.drawGround();
    this.drawSky();
    this.drawBombFlash();
    this.vignette.draw();
    this.hud.draw(this.bossBar());
  }

  exit(): void {
    this.bossDamage.remove();
  }

  // Propaganda reads the word clocks at draw time, by when the pilot exists.
  private createHud(assets: Assets): HUD {
    return new HUD(
      this.p,
      assets.font,
      new Propaganda({
        dashReady: () => this.player.dashReady,
        truthReady: () => this.newspeak.truthReady,
        truthLeft: () => this.newspeak.truthLeft,
      }),
    );
  }

  private createSpawner(assets: Assets): Spawner {
    return new Spawner(this.level, {
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

  // The canvas still holds the last frame drawn, which the telescreen switches off.
  private showGameOver(): void {
    this.manager.change(new GameOverScene(this.p, this.manager, this.p.get()));
  }

  // The last level has no next one until the endings exist, so the run goes back to the Menu.
  private leaveLevel(): void {
    judgeLevel();
    if (state.level < LEVELS.length) {
      state.level++;
      this.manager.change(new DictionaryScene(this.p, this.manager));
    } else this.manager.change(new MenuScene(this.p, this.manager));
  }

  // Only a pilot with the stick acts. The bomb flash fades either way, and TRUTH's clock runs
  // between the bomb and a new truth, so a truth revealed this tick keeps its full length.
  private act(): void {
    const { input } = this.manager;
    const { player } = this;
    const inControl = this.flight.flying && player.alive;

    if (inControl) player.update();
    if (this.flash > 0) this.flash--;
    if (inControl && state.bombs > 0 && input.wasPressed("bomb")) this.bomb();
    this.newspeak.update();
    if (inControl && input.wasPressed("truth")) this.newspeak.revealTruth();
  }

  // Nothing new comes once the city has stopped: the end of a level belongs to its boss.
  private spawn(): void {
    if (this.flight.atEnd) return;
    this.spawner.update(
      this.flight.scroll,
      state.alertLevel,
      this.police?.holding ?? false,
    );
  }

  private moveAll(): void {
    // Ground things ride the city, which stops for the boss and starts again to land.
    for (const ground of [
      ...this.turrets,
      ...this.eyes.filter((eye) => eye.type === "tower"),
      ...(this.diary ? [this.diary] : []),
    ])
      ground.vel.y = this.flight.speed;

    // Camouflage only shows its truth while TRUTH is active.
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
  }

  private removeDead(): void {
    this.enemies = this.enemies.filter((enemy) => enemy.alive);
    this.eyes = this.eyes.filter((eye) => eye.alive);
    this.turrets = this.turrets.filter((turret) => turret.alive);
    this.bullets = this.bullets.filter((bullet) => bullet.alive);
    this.explosions = this.explosions.filter((explosion) => explosion.alive);
    this.pickups = this.pickups.filter((pickup) => pickup.alive);
    if (!this.diary?.alive) this.diary = null;
  }

  // After watching, so suspicion ends the tick right at the reset when the Thought Police go.
  private updateRegime(): void {
    // Killed or outlasted, the Thought Police are gone either way, and suspicion settles.
    if (this.police && !this.police.alive) {
      this.police = null;
      this.suspicion.release();
    }

    if (this.boss && !this.boss.alive) {
      this.boss = null;
      this.bossDown = true;
    }

    // The Thought Police come at full suspicion, but never once the city has stopped for the boss.
    if (
      !this.police &&
      !this.flight.atEnd &&
      state.alertLevel === ALERT.thoughtPolice
    )
      this.summonPolice();

    // The boss comes once the city stops, after the Thought Police have gone.
    if (
      this.flight.flying &&
      this.flight.atEnd &&
      !this.police &&
      !this.boss &&
      !this.bossDown
    )
      this.summonBoss();
  }

  // The boss is down, the sky is clear, and the pilot is still flying.
  private readyToLand(): boolean {
    return (
      this.flight.flying &&
      this.bossDown &&
      !this.police &&
      this.player.alive &&
      this.enemies.length === 0
    );
  }

  private startLanding(): void {
    this.flight.startLanding();
    this.clearHostileFire();
  }

  private clearHostileFire(): void {
    for (const bullet of this.bullets)
      if (bullet.owner !== "player") bullet.alive = false;
  }

  // Clears what is on screen: every enemy aircraft, each one a kill, and every shot but the pilot's;
  // the Thought Police and the boss only take a heavy blow. Enemies still above the top edge come
  // through, and the ground is out of reach: towers, drones, and guns stand below the blast.
  private bomb(): void {
    state.bombs--;
    this.flash = BOMB_FLASH_FRAMES;

    // Every enemy aircraft on screen goes down.
    for (const enemy of this.enemies)
      if (enemy.alive && !enemy.isOffscreen(ENEMY_STATS[enemy.kind].halfSize)) {
        enemy.alive = false;
        this.kill(enemy);
      }

    this.clearHostileFire();

    // The giants on screen take the heavy blow, which may finish them.
    for (const giant of [this.police, this.boss])
      if (
        giant &&
        !giant.isOffscreen(giant.halfSize) &&
        giant.hit(BOMB_BOSS_DAMAGE)
      )
        this.kill(giant);
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

    this.boss = new LevelBoss(kind, x, this.arena, this.bossDamage);
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

  // A dead pilot can't be seen, so the cones go quiet during the crash, and while the regime flies
  // the plane.
  private watch(): void {
    const { player } = this;

    for (const eye of this.eyes)
      eye.detecting =
        this.flight.flying && player.alive && eye.sees(player.pos);
    const seenBy = this.eyes.filter((eye) => eye.detecting);

    this.suspicion.update(seenBy, player.pos);
    this.vignette.update(seenBy.length > 0);
  }

  // Asked afresh for every pair: a hit earlier in the same tick changes it.
  private get exposed(): boolean {
    const { player } = this;
    return this.flight.flying && player.alive && !player.invulnerable;
  }

  // The pilot's shots, then the enemy's, then bodies meeting, then what the pilot picks up.
  private collide(): void {
    this.collidePlayerShots();
    this.collideHostileShots();
    this.collideCrashes();
    this.collideRams();
    this.readDiary();
    this.collectPickups();
  }

  // A shot spends itself on the first thing it touches; only the hit that destroys a target counts.
  private collidePlayerShots(): void {
    const targets = [
      ...this.enemies,
      ...(this.police ? [this.police] : []),
      ...(this.boss ? [this.boss] : []),
      ...this.turrets,
      ...this.eyes,
    ];

    for (const bullet of this.bullets) {
      if (!bullet.alive || bullet.owner !== "player") continue;

      const target = targets.find(
        (target) => target.alive && circlesOverlap(bullet, target),
      );
      if (!target) continue;

      bullet.alive = false;
      if (!target.hit()) continue;
      if (target instanceof Eye) this.blind(target);
      else this.kill(target);
    }
  }

  private collideHostileShots(): void {
    for (const bullet of this.bullets) {
      if (!bullet.alive || bullet.owner === "player") continue;
      if (!this.exposed || !circlesOverlap(bullet, this.player)) continue;

      bullet.alive = false;
      this.hitPlayer();
    }
  }

  // A crash destroys the enemy too, but scores nothing: it isn't a kill.
  // Turrets and eyes stay out of this: the plane flies over the ground.
  private collideCrashes(): void {
    for (const enemy of this.enemies) {
      if (!enemy.alive || !this.exposed) continue;
      if (!circlesOverlap(enemy, this.player)) continue;

      enemy.alive = false;
      this.explosions.push(this.explosionFor(enemy));
      this.hitPlayer();
    }
  }

  // Ramming the Thought Police or an air boss costs a life and leaves them flying.
  private collideRams(): void {
    for (const giant of [this.police, this.boss])
      if (
        giant?.alive &&
        !(giant instanceof LevelBoss && giant.def.ground) &&
        this.exposed &&
        circlesOverlap(giant, this.player)
      )
        this.hitPlayer();
  }

  // Only by a pilot with the stick: the regime's autopilot never reaches for what it would forbid.
  private get canReach(): boolean {
    return this.flight.flying && this.player.alive;
  }

  private readDiary(): void {
    const { diary, player } = this;
    if (!diary?.alive || !this.canReach || !circlesOverlap(diary, player))
      return;

    diary.alive = false;
    this.newspeak.readDiary();
    this.hud.typeDiary(currentStrings().diary.pages[state.level - 1].line);
  }

  // Even while blinking: only a pilot who is down, or not flying the plane, can't reach for a word.
  private collectPickups(): void {
    for (const pickup of this.pickups) {
      if (!this.canReach || !circlesOverlap(pickup, this.player)) continue;

      pickup.alive = false;
      this.newspeak.collect(pickup.word);
    }
  }

  private kill(target: Kill): void {
    state.realScore += target.score;
    record("kills");
    this.explosions.push(this.explosionFor(target));
    if (target instanceof Enemy && target.drops)
      this.pickups.push(new Pickup(target.drops, target.pos, this.font));
  }

  // As big as what went down; the regime's own burn in its red.
  private explosionFor(target: Kill): Explosion {
    const { pos } = target;

    if (target instanceof LevelBoss)
      return new Explosion(
        pos,
        target.halfSize * 2,
        target.def.regime ? RED : PAPER,
      );
    if (target instanceof ThoughtPolice)
      return new Explosion(pos, THOUGHT_POLICE_STATS.halfSize * 2, RED);
    if (target instanceof Turret)
      return new Explosion(pos, TURRET_STATS.halfSize * 2);
    return new Explosion(pos, ENEMY_STATS[target.kind].halfSize * 2);
  }

  // The regime notices at once, and its eyes burst in its own red.
  private blind(eye: Eye): void {
    this.suspicion.add(EYE_DESTROYED_SUSPICION);
    record("eyesDestroyed");
    this.explosions.push(
      new Explosion(eye.pos, EYE_STATS[eye.type].halfSize * 2, RED),
    );
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

  // The city, then what stands on it from the lowest up; a ground boss is part of the ground.
  private drawGround(): void {
    const { p } = this;

    this.background.draw(this.flight.scroll);
    this.diary?.draw(p);
    for (const turret of this.turrets) turret.draw(p);
    if (this.boss?.def.ground) this.boss.draw(p);
    for (const eye of this.eyes) eye.draw(p);
  }

  // Everything in the air, with explosions over it all.
  private drawSky(): void {
    const { p } = this;

    for (const enemy of this.enemies) enemy.draw(p);
    this.police?.draw(p);
    if (this.boss && !this.boss.def.ground) this.boss.draw(p);
    for (const pickup of this.pickups) pickup.draw(p);
    for (const bullet of this.bullets) bullet.draw(p);
    if (this.player.alive) this.player.draw(p);
    for (const explosion of this.explosions) explosion.draw(p);
  }

  private drawBombFlash(): void {
    if (this.flash === 0) return;

    const { p } = this;
    const context = p.drawingContext as CanvasRenderingContext2D;

    context.globalAlpha = (BOMB_FLASH_ALPHA * this.flash) / BOMB_FLASH_FRAMES;
    p.noStroke();
    p.fill(PAPER);
    p.rect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    context.globalAlpha = 1;
  }

  // Whichever giant is on screen; the Thought Police are always the regime's own.
  private bossBar(): BossBar | null {
    const { police, boss } = this;

    if (police) return { name: "police", health: police.health, regime: true };
    if (boss)
      return { name: boss.kind, health: boss.health, regime: boss.def.regime };
    return null;
  }
}
