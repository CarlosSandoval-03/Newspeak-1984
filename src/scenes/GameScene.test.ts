import type p5 from "p5";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Assets } from "../assets";
import {
  ALERT_SPAWN_MULT,
  ENEMY_STATS,
  EYE_DESTROYED_SUSPICION,
  EYE_STATS,
  GAME_OVER_DELAY,
  PLAYER_SPAWN,
  STARTING_LIVES,
  SUSPICION_DECAY,
  THOUGHT_POLICE_RESET,
  THOUGHT_POLICE_STATS,
  THOUGHT_POLICE_TIMEOUT,
  TURRET_STATS,
} from "../config";
import { Input } from "../core/Input";
import { SceneManager } from "../core/SceneManager";
import { Bullet } from "../entities/Bullet";
import { Enemy } from "../entities/Enemy";
import { Eye } from "../entities/Eye";
import { Turret } from "../entities/Turret";
import { LEVELS } from "../levels/levels";
import { resetGame, state } from "../state";
import { ALERT, type EnemyKind, type Vec } from "../types";
import { GameScene } from "./GameScene";
import { GameOverScene } from "./GameOverScene";

// Each image is stood in for by its own name; nothing here draws.
const images = new Proxy({}, { get: (_, name) => name }) as Assets["image"];

describe("GameScene collisions", () => {
  let manager: SceneManager;
  let scene: GameScene;

  // Bracket access reaches the scene's private lists, to set up exact situations.
  const enemyAt = (kind: EnemyKind, pos: Vec) => {
    const enemy = new Enemy(
      kind,
      pos,
      () => pos,
      images,
      () => {},
    );
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
      { image: images, font: {} } as Assets,
      new Input(new EventTarget()),
    );
    scene = new GameScene({ get: () => ({}) } as unknown as p5, manager);
    manager.change(scene);
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

  it("starts the waves over once they are all cleared, without rewinding the city", () => {
    scene["scroll"] = 1_000_000;
    scene.update();
    expect(scene["spawner"].done).toBe(true);

    scene["enemies"] = [];
    scene.update();

    expect(scene["spawner"].done).toBe(false);
    expect(scene["scroll"]).toBeGreaterThan(1_000_000);
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
    scene["scroll"] = first.at;

    scene.update();

    expect(scene["enemies"]).toHaveLength(
      Math.ceil(first.count * ALERT_SPAWN_MULT),
    );
  });

  describe("turrets", () => {
    const turretAt = (pos: Vec) => {
      const turret = new Turret(
        pos,
        () => pos,
        images,
        () => {},
      );
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
