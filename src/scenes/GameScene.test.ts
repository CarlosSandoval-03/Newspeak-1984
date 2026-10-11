import type p5 from "p5";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Assets } from "../assets";
import {
  BOSS_STATS,
  CANVAS_WIDTH,
  CELL_SIZE,
  ALERT_SPAWN_MULT,
  DIARY_BONUS_SCORE,
  BOMB_BOSS_DAMAGE,
  ENEMY_STATS,
  EYE_DESTROYED_SUSPICION,
  EYE_STATS,
  GAME_OVER_DELAY,
  LANDING_HOLD_FRAMES,
  LANDING_LEAD,
  PAPER,
  PLAYER_SPAWN,
  SCROLL_SPEED,
  STARTING_LIVES,
  SUSPICION_DECAY,
  THOUGHT_POLICE_RESET,
  THOUGHT_POLICE_STATS,
  THOUGHT_POLICE_TIMEOUT,
  TURRET_STATS,
} from "../config";
import { Input } from "../core/Input";
import { currentStrings } from "../i18n";
import { SceneManager } from "../core/SceneManager";
import { Bullet } from "../entities/Bullet";
import { Enemy } from "../entities/Enemy";
import { Diary } from "../entities/Diary";
import { Eye } from "../entities/Eye";
import { Pickup } from "../entities/Pickup";
import { Turret } from "../entities/Turret";
import { anchorNear, streetColumns } from "../levels/layout";
import { LEVELS } from "../levels/levels";
import { resetGame, state } from "../state";
import { ALERT, type EnemyKind, type Vec } from "../types";
import { DictionaryScene } from "./DictionaryScene";
import { GameScene } from "./GameScene";
import { GameOverScene } from "./GameOverScene";
import { MenuScene } from "./MenuScene";

// Each image is stood in for by its own name; nothing here draws.
const images = new Proxy({}, { get: (_, name) => name }) as Assets["image"];
const platform: Assets["platform"] = {
  sprite: "launch-platform.png",
  park: { x: 56, y: 128 },
  liftoff: { x: 56, y: 24 },
  touchdown: { x: 56, y: 232 },
  lamps: [],
};

// Past the takeoff, with the stick, as most situations here need.
function fly(scene: GameScene): void {
  scene["flight"]["phase"] = "flying";
  scene["flight"].speed = SCROLL_SPEED;
  scene["player"].altitude = 1;
}

describe("GameScene collisions", () => {
  let keys: EventTarget;
  let manager: SceneManager;
  let scene: GameScene;

  // Bracket access reaches the scene's private lists, to set up exact situations.
  const enemyAt = (kind: EnemyKind, pos: Vec) => {
    const enemy = new Enemy(kind, pos, {
      images,
      fire: () => {},
      target: () => pos,
    });
    scene["enemies"].push(enemy);
    return enemy;
  };

  // Looks straight down, wide and far, at whatever sits below it.
  const eyeAbove = (pos: Vec) => {
    const eye = new Eye(
      {
        type: "drone",
        at: 0,
        x: pos.x,
        path: "sine",
        facing: 90,
        range: 300,
        sweepAmp: 0,
        sweepSpeed: 0,
        aperture: 90,
      },
      pos,
      images,
    );
    scene["eyes"].push(eye);
    return eye;
  };

  const bulletAt = (owner: "player" | "enemy", pos: Vec) =>
    scene["bullets"].push(new Bullet(owner, pos, { x: 0, y: 0 }));

  beforeEach(() => {
    resetGame();
    manager = new SceneManager(
      { image: images, font: {}, platform } as Assets,
      new Input((keys = new EventTarget())),
    );
    scene = new GameScene({ get: () => ({}) } as unknown as p5, manager);
    manager.change(scene);
    fly(scene);
  });

  describe("the takeoff", () => {
    const press = (code: string) =>
      keys.dispatchEvent(Object.assign(new Event("keydown"), { code }));

    beforeEach(() => {
      scene = new GameScene({ get: () => ({}) } as unknown as p5, manager);
      manager.change(scene);
    });

    it("gives the pilot no stick and no gun until the plane is in the air", () => {
      const player = scene["player"];
      press("ArrowLeft");
      press("Space");

      while (!scene["flight"].flying) {
        scene.update();
        manager.input.endFrame();
        if (scene["flight"].flying) break;

        expect(player.pos).toEqual(PLAYER_SPAWN);
        expect(scene["bullets"]).toHaveLength(0);
      }

      // The stick answers on the very tick the climb ends.
      expect(player.pos.x).toBeLessThan(PLAYER_SPAWN.x);
    });

    it("can't be hit before the pilot has the stick", () => {
      bulletAt("enemy", PLAYER_SPAWN);
      enemyAt("straight", PLAYER_SPAWN);

      scene.update();

      expect(state.realLives).toBe(STARTING_LIVES);
    });
  });

  it("starts the level with the words it leaves, and bombs to match", () => {
    state.wordLevels.REMEMBER = 2;
    state.words.delete("FREE");

    manager.change(
      new GameScene({ get: () => ({}) } as unknown as p5, manager),
    );

    expect(state.bombs).toBe(2);
    expect(state.words.has("FREE")).toBe(false);
  });

  it("scores and explodes an enemy a player bullet destroys", () => {
    enemyAt("straight", { x: 100, y: 100 });
    bulletAt("player", { x: 100, y: 100 });

    scene.update();

    expect(state.realScore).toBe(ENEMY_STATS.straight.score);
    expect(state.stats.kills).toBe(1);
    expect(scene["enemies"]).toHaveLength(0);
    expect(scene["bullets"]).toHaveLength(0);
    expect(scene["explosions"]).toHaveLength(1);
  });

  it("only uses up the bullet when the hit doesn't kill", () => {
    enemyAt("bomber", { x: 100, y: 100 });
    bulletAt("player", { x: 100, y: 100 });

    scene.update();

    expect(state.realScore).toBe(0);
    expect(scene["enemies"]).toHaveLength(1);
    expect(scene["bullets"]).toHaveLength(0);
  });

  it("costs a life for an enemy bullet, then ignores hits while invulnerable", () => {
    bulletAt("enemy", PLAYER_SPAWN);

    scene.update();
    expect(state.realLives).toBe(STARTING_LIVES - 1);
    expect(scene["player"].invulnerable).toBe(true);
    expect(scene["explosions"]).toHaveLength(1);

    bulletAt("enemy", PLAYER_SPAWN);
    scene.update();
    expect(state.realLives).toBe(STARTING_LIVES - 1);
  });

  it("destroys an enemy that crashes into the player, without scoring it", () => {
    enemyAt("bomber", PLAYER_SPAWN);

    scene.update();

    expect(state.realLives).toBe(STARTING_LIVES - 1);
    expect(state.realScore).toBe(0);
    expect(state.stats.kills).toBe(0);
    expect(scene["enemies"]).toHaveLength(0);
  });

  it("counts two hits on one tick as one", () => {
    bulletAt("enemy", PLAYER_SPAWN);
    bulletAt("enemy", PLAYER_SPAWN);

    scene.update();

    expect(state.realLives).toBe(STARTING_LIVES - 1);
  });

  it("lets the crash play out, then vaporizes the pilot", () => {
    const change = vi.spyOn(manager, "change");
    state.realLives = 1;
    bulletAt("enemy", PLAYER_SPAWN);

    scene.update();
    expect(scene["player"].alive).toBe(false);

    for (let i = 1; i < GAME_OVER_DELAY; i++) scene.update();
    expect(change).not.toHaveBeenCalled();

    scene.update();
    expect(change).toHaveBeenCalledWith(expect.any(GameOverScene));
  });

  it("can't be hit again once the last life is gone", () => {
    state.realLives = 1;
    bulletAt("enemy", PLAYER_SPAWN);
    scene.update();

    bulletAt("enemy", scene["player"].pos);
    scene.update();

    expect(state.realLives).toBe(0);
  });

  describe("the level's end", () => {
    const { length } = LEVELS[0];
    // The scroll at which the landing platform's eye lies under the parked plane.
    const parked = length + LANDING_LEAD + PLAYER_SPAWN.y;

    beforeEach(() => {
      scene["flight"].scroll = length;
    });

    it("stops the city at the level's length and brings in the level's boss", () => {
      const turret = new Turret(
        { x: 300, y: 200 },
        { images, fire: () => {}, target: () => PLAYER_SPAWN },
      );
      scene["turrets"].push(turret);

      scene.update();

      expect(scene["flight"].scroll).toBe(length);
      expect(turret.pos.y).toBe(200);
      expect(scene["boss"]?.kind).toBe(LEVELS[0].boss);
      expect(scene["bossBar"]()).toMatchObject({
        name: LEVELS[0].boss,
        regime: false,
      });
    });

    it("lands only once the boss is down and the sky is clear", () => {
      scene.update();
      const boss = scene["boss"]!;
      while (boss.pos.y < 0) scene.update();
      const enemy = enemyAt("straight", { x: 100, y: 300 });
      boss.hit(BOSS_STATS.fortress.hp - 1);
      bulletAt("player", boss.pos);
      const score = state.realScore;

      scene.update();
      expect(state.realScore - score).toBe(BOSS_STATS.fortress.score);
      // A foreign boss bursts in paper; only the regime's own burn red.
      expect(scene["explosions"].at(-1)!["color"]).toBe(PAPER);
      expect(scene["boss"]).toBeNull();
      expect(scene["flight"].landing).toBe(false);

      enemy.alive = false;
      bulletAt("enemy", { x: 50, y: 50 });
      scene.update();
      expect(scene["flight"].landing).toBe(true);
      expect(scene["flight"].flying).toBe(false);
      expect(scene["bullets"].every((bullet) => !bullet.alive)).toBe(true);
    });

    it("keeps the boss waiting while the Thought Police hold the sky", () => {
      scene["flight"].scroll = length - 1;
      scene["suspicion"].add(100);
      scene.update();
      expect(scene["police"]).not.toBeNull();
      expect(scene["bossBar"]()).toMatchObject({ name: "police", regime: true });

      scene.update();
      expect(scene["boss"]).toBeNull();

      scene["police"]!.alive = false;
      scene.update();
      scene.update();
      expect(scene["boss"]).not.toBeNull();
    });

    it("never calls the Thought Police once the city has stopped", () => {
      scene["suspicion"].add(100);

      scene.update();

      expect(scene["police"]).toBeNull();
    });

    it("rides a ground boss in on the street nearest the middle", () => {
      state.level = 3;
      const level3 = new GameScene(
        { get: () => ({}) } as unknown as p5,
        manager,
      );
      manager.change(level3);
      fly(level3);
      level3["flight"].scroll = LEVELS[2].length;

      level3.update();

      const boss = level3["boss"]!;
      expect(boss.def.ground).toBe(true);
      const streets = streetColumns(LEVELS[2].terrain.seed).map(
        (column) => (column + 0.5) * CELL_SIZE,
      );
      const off = (x: number) => Math.abs(x - CANVAS_WIDTH / 2);
      expect(streets).toContain(boss.pos.x);
      expect(off(boss.pos.x)).toBe(Math.min(...streets.map(off)));

      // The plane flies over it, as over any ground.
      while (boss.pos.y < 0) level3.update();
      level3["player"].pos = { ...boss.pos };
      level3.update();
      expect(state.realLives).toBe(STARTING_LIVES);
    });

    it("takes a bomb as a heavy blow, and costs a life when rammed in the air", () => {
      state.bombs = 1;
      scene.update();
      const boss = scene["boss"]!;
      while (boss.pos.y < 0) scene.update();
      scene["player"].pos = { ...boss.pos };
      const health = boss.health;

      keys.dispatchEvent(Object.assign(new Event("keydown"), { code: "KeyC" }));
      scene.update();

      expect(boss.health).toBeCloseTo(
        health - BOMB_BOSS_DAMAGE / BOSS_STATS.fortress.hp,
      );
      expect(state.realLives).toBe(STARTING_LIVES - 1);
    });

    it("opens the next level's Dictionary once the plane has landed", () => {
      const change = vi.spyOn(manager, "change");
      scene["bossDown"] = true;

      while (change.mock.calls.length === 0) scene.update();

      expect(scene["flight"].landed).toBe(true);
      expect(scene["flight"].scroll).toBe(parked);
      expect(state.level).toBe(2);
      expect(change).toHaveBeenCalledWith(expect.any(DictionaryScene));
    });

    it("can't be seen or shot at while the regime flies the plane", () => {
      const eye = eyeAbove({ x: PLAYER_SPAWN.x, y: PLAYER_SPAWN.y - 100 });
      scene["flight"]["phase"] = "landing";

      for (let i = 0; i < 300; i++) {
        scene.update();
        // As any gun would, through the scene's own hand.
        scene["arena"].fire(
          new Bullet("enemy", { x: 0, y: 0 }, { x: 0, y: 0 }),
        );
      }

      expect(eye.detecting).toBe(false);
      expect(state.suspicion).toBe(0);
      expect(scene["bullets"]).toHaveLength(0);
    });

    it("goes back to the Menu after the last level, until the endings exist", () => {
      const change = vi.spyOn(manager, "change");
      state.level = LEVELS.length;
      scene["flight"].scroll = parked;
      scene["flight"].speed = 0;
      scene["flight"]["phase"] = "landing";

      for (let i = 0; i < LANDING_HOLD_FRAMES; i++) scene.update();

      expect(change).toHaveBeenCalledWith(expect.any(MenuScene));
    });
  });

  it("raises suspicion while an eye sees the player, and only then", () => {
    const eye = eyeAbove({ x: PLAYER_SPAWN.x, y: PLAYER_SPAWN.y - 100 });

    scene.update();
    expect(eye.detecting).toBe(true);
    expect(state.suspicion).toBeGreaterThan(0);
    expect(state.stats.framesSeen).toBe(1);
    expect(scene["vignette"].strength).toBeGreaterThan(0);

    scene["player"].pos.x += 200;
    const seen = state.suspicion;
    scene.update();
    expect(eye.detecting).toBe(false);
    expect(state.suspicion).toBeLessThan(seen);
  });

  it("can't see a pilot who is already down", () => {
    const eye = eyeAbove({ x: PLAYER_SPAWN.x, y: PLAYER_SPAWN.y - 100 });
    scene["player"].alive = false;

    scene.update();

    expect(eye.detecting).toBe(false);
    expect(state.suspicion).toBe(0);
  });

  it("draws the regime's attention when an eye is shot down", () => {
    const eye = eyeAbove({ x: 100, y: 100 });

    for (let i = 0; i < EYE_STATS.drone.hp; i++) {
      bulletAt("player", eye.pos);
      scene.update();
    }

    // The same tick also decays it, since nothing sees the pilot.
    expect(state.suspicion).toBeCloseTo(
      EYE_DESTROYED_SUSPICION - SUSPICION_DECAY,
    );
    expect(state.stats.eyesDestroyed).toBe(1);
    expect(state.realScore).toBe(0);
    expect(scene["eyes"]).toHaveLength(0);
    expect(scene["explosions"]).toHaveLength(1);
  });

  it("never costs a life for flying into an eye", () => {
    eyeAbove(PLAYER_SPAWN);

    scene.update();

    expect(state.realLives).toBe(STARTING_LIVES);
    expect(scene["eyes"]).toHaveLength(1);
  });

  it("sends bigger waves once the regime is on alert", () => {
    const first = LEVELS[0].waves[0];
    state.suspicion = 50;
    state.alertLevel = ALERT.alert;
    scene["flight"].scroll = first.at;

    scene.update();

    expect(scene["enemies"]).toHaveLength(
      Math.ceil(first.count * ALERT_SPAWN_MULT),
    );
  });

  describe("a bomb", () => {
    // One tick with C pressed, then the press is spent, as the scene manager would do.
    const bomb = () => {
      keys.dispatchEvent(Object.assign(new Event("keydown"), { code: "KeyC" }));
      keys.dispatchEvent(Object.assign(new Event("keyup"), { code: "KeyC" }));
      scene.update();
      manager.input.endFrame();
    };

    beforeEach(() => {
      state.bombs = 2;
    });

    it("downs every enemy on screen as a kill, and spends one bomb", () => {
      enemyAt("bomber", { x: 100, y: 100 }).drops = "TRUTH";
      enemyAt("escort", { x: 300, y: 200 });

      bomb();

      expect(scene["enemies"]).toHaveLength(0);
      expect(state.realScore).toBe(
        ENEMY_STATS.bomber.score + ENEMY_STATS.escort.score,
      );
      expect(state.stats.kills).toBe(2);
      expect(scene["pickups"].map(({ word }) => word)).toEqual(["TRUTH"]);
      expect(state.bombs).toBe(1);
    });

    it("spares enemies still above the top edge", () => {
      enemyAt("straight", { x: 100, y: -ENEMY_STATS.straight.halfSize - 10 });

      bomb();

      expect(scene["enemies"]).toHaveLength(1);
    });

    it("clears every shot but the pilot's, and leaves the ground standing", () => {
      bulletAt("enemy", { x: 100, y: 100 });
      scene["bullets"].push(
        new Bullet("regime", { x: 200, y: 100 }, { x: 0, y: 0 }),
      );
      bulletAt("player", { x: 300, y: 300 });
      const eye = eyeAbove({ x: 400, y: 100 });

      bomb();

      expect(scene["bullets"].map(({ owner }) => owner)).toEqual(["player"]);
      expect(scene["eyes"]).toEqual([eye]);
    });

    it("only wounds the Thought Police", () => {
      scene["suspicion"].add(100);
      scene.update();
      const police = scene["police"]!;
      police.pos = { x: 240, y: 200 };

      bomb();

      expect(police.alive).toBe(true);
      expect(police.health).toBeCloseTo(
        1 - BOMB_BOSS_DAMAGE / THOUGHT_POLICE_STATS.hp,
      );
    });

    it("can finish the Thought Police off", () => {
      scene["suspicion"].add(100);
      scene.update();
      const police = scene["police"]!;
      police.pos = { x: 240, y: 200 };
      for (let i = BOMB_BOSS_DAMAGE; i < THOUGHT_POLICE_STATS.hp; i++)
        police.hit();

      bomb();

      expect(scene["police"]).toBeNull();
      expect(state.suspicion).toBe(THOUGHT_POLICE_RESET);
      expect(state.realScore).toBeGreaterThanOrEqual(
        THOUGHT_POLICE_STATS.score,
      );
    });

    it("does nothing with none left, or once the pilot is down", () => {
      enemyAt("straight", { x: 100, y: 100 });
      state.bombs = 0;
      bomb();
      expect(scene["enemies"]).toHaveLength(1);

      state.bombs = 1;
      scene["player"].alive = false;
      bomb();
      expect(scene["enemies"]).toHaveLength(1);
      expect(state.bombs).toBe(1);
    });
  });

  it("flies level 2's camouflaged waves in camouflage", () => {
    state.level = 2;
    const level2 = new GameScene({ get: () => ({}) } as unknown as p5, manager);
    manager.change(level2);
    fly(level2);
    const wave = LEVELS[1].waves.find((wave) => wave.camo)!;
    // The waves before it come and are cleared first, so only this one is left to look at.
    level2["flight"].scroll = wave.at - 1;
    level2.update();
    level2["enemies"] = [];

    level2.update();

    expect(level2["enemies"]).toHaveLength(wave.count);
    expect(level2["enemies"].every((enemy) => enemy.camo)).toBe(true);
  });

  it("reveals camouflaged enemies while TRUTH is active, with V", () => {
    state.wordLevels.TRUTH = 1;
    const enemy = enemyAt("straight", { x: 100, y: 100 });
    enemy.camo = true;

    scene.update();
    expect(enemy.revealed).toBe(false);

    keys.dispatchEvent(Object.assign(new Event("keydown"), { code: "KeyV" }));
    scene.update();
    expect(enemy.revealed).toBe(true);
  });

  describe("the diary", () => {
    const diaryAt = (pos: Vec) => {
      scene["diary"] = new Diary(pos, images);
    };

    it("is read by flying over it, and its line is typed in the band", () => {
      diaryAt({ ...PLAYER_SPAWN });

      scene.update();

      expect(scene["diary"]).toBeNull();
      expect(state.stats.diaries).toBe(1);
      expect(state.realScore).toBe(DIARY_BONUS_SCORE);
      const typed = scene["hud"]["diary"]!;
      typed.finish();
      expect(typed.shown(0)).toBe(currentStrings().diary.pages[0].line);
    });

    it("lies out of reach of a pilot who is down", () => {
      diaryAt({ ...PLAYER_SPAWN });
      scene["player"].alive = false;

      scene.update();

      expect(state.stats.diaries).toBe(0);
    });

    it("is laid on its skylight as the city brings it on screen", () => {
      const { diary } = LEVELS[0];
      // Just past its skylight, so it would lie on screen.
      const onScreen = anchorNear(LEVELS[0], "skylight", diary.at).y + 100;

      scene["flight"].scroll = onScreen;
      scene.update();
      expect(scene["diary"]).not.toBeNull();
    });
  });

  describe("pickups", () => {
    const pickupAt = (pos: Vec) => {
      const pickup = new Pickup("FREE", pos, {} as p5.Font);
      scene["pickups"].push(pickup);
      return pickup;
    };

    it("are collected by flying into them, and wake their word", () => {
      pickupAt({ ...PLAYER_SPAWN });

      scene.update();

      expect(state.wordLevels.FREE).toBe(1);
      expect(scene["pickups"]).toHaveLength(0);
    });

    it("stay out of reach of a pilot who is down", () => {
      pickupAt({ ...PLAYER_SPAWN });
      scene["player"].alive = false;

      scene.update();

      expect(state.wordLevels.FREE).toBe(0);
      expect(scene["pickups"]).toHaveLength(1);
    });

    it("fall from an enemy that carried one when it is shot down", () => {
      enemyAt("straight", { x: 100, y: 100 }).drops = "ESCAPE";
      bulletAt("player", { x: 100, y: 100 });

      scene.update();

      expect(scene["pickups"].map(({ word }) => word)).toEqual(["ESCAPE"]);
      expect(scene["pickups"][0].pos.x).toBe(100);
    });

    it("go down with an enemy that crashes into the pilot", () => {
      enemyAt("bomber", PLAYER_SPAWN).drops = "ESCAPE";

      scene.update();

      expect(scene["pickups"]).toHaveLength(0);
    });
  });

  describe("turrets", () => {
    const turretAt = (pos: Vec) => {
      const turret = new Turret(pos, {
        images,
        fire: () => {},
        target: () => pos,
      });
      scene["turrets"].push(turret);
      return turret;
    };

    it("score like an enemy when shot down", () => {
      const turret = turretAt({ x: 100, y: 100 });

      for (let i = 0; i < TURRET_STATS.hp; i++) {
        bulletAt("player", turret.pos);
        scene.update();
      }

      expect(state.realScore).toBe(TURRET_STATS.score);
      expect(state.stats.kills).toBe(1);
      expect(scene["turrets"]).toHaveLength(0);
    });

    it("never cost a life for flying over one", () => {
      turretAt({ ...PLAYER_SPAWN });

      scene.update();

      expect(state.realLives).toBe(STARTING_LIVES);
      expect(scene["turrets"]).toHaveLength(1);
    });
  });

  describe("the Thought Police", () => {
    // The way an eye shot down at 90 would do it: all at once, mid-tick.
    const fullSuspicion = () => scene["suspicion"].add(100);
    const escorts = () =>
      scene["enemies"].filter((enemy) => enemy.kind === "escort");

    it("come at full suspicion, with their escort, and freeze it there", () => {
      fullSuspicion();
      scene.update();

      expect(scene["police"]).not.toBeNull();
      expect(escorts()).toHaveLength(2);

      for (let i = 0; i < 60; i++) scene.update();
      expect(state.suspicion).toBe(100);
      expect(state.alertLevel).toBe(ALERT.thoughtPolice);
    });

    it("come once at a time", () => {
      fullSuspicion();
      scene.update();
      const police = scene["police"];

      scene.update();

      expect(scene["police"]).toBe(police);
      expect(escorts()).toHaveLength(2);
    });

    it("leave suspicion at the reset when shot down, and score", () => {
      fullSuspicion();
      scene.update();
      const police = scene["police"]!;
      // On screen, where a bullet can reach it.
      police.pos = { x: 240, y: 200 };
      for (let i = 1; i < THOUGHT_POLICE_STATS.hp; i++) police.hit();

      bulletAt("player", police.pos);
      scene.update();

      expect(scene["police"]).toBeNull();
      expect(state.suspicion).toBe(THOUGHT_POLICE_RESET);
      expect(state.realScore).toBe(THOUGHT_POLICE_STATS.score);
    });

    it("leave suspicion at the reset when outlasted too", () => {
      fullSuspicion();
      scene.update();
      // Out of their reach, so the wait is all that's tested.
      scene["player"].alive = false;
      scene["gameOverIn"] = 0;

      for (let i = 0; i < THOUGHT_POLICE_TIMEOUT + 300; i++) {
        scene.update();
        if (!scene["police"]) break;
      }

      expect(scene["police"]).toBeNull();
      expect(state.suspicion).toBe(THOUGHT_POLICE_RESET);
      expect(state.realScore).toBe(0);
    });

    it("come back if suspicion climbs to the top again", () => {
      fullSuspicion();
      scene.update();
      scene["police"]!.alive = false;
      scene.update();
      expect(scene["police"]).toBeNull();

      fullSuspicion();
      scene.update();
      expect(scene["police"]).not.toBeNull();
    });

    it("hold the waves back while they're here", () => {
      fullSuspicion();
      scene.update();
      scene["flight"].scroll = LEVELS[0].waves[0].at;

      for (let i = 0; i < 60; i++) scene.update();

      // An autogyro may have come on the tick suspicion hit the top, before they arrived.
      const waves = scene["enemies"].filter(
        ({ kind }) => kind !== "escort" && kind !== "homing",
      );
      expect(waves).toHaveLength(0);
    });

    it("cost a life when rammed, and fly on", () => {
      fullSuspicion();
      scene.update();
      scene["police"]!.pos = { ...scene["player"].pos };

      scene.update();

      expect(state.realLives).toBe(STARTING_LIVES - 1);
      expect(scene["police"]!.alive).toBe(true);
    });
  });
});
