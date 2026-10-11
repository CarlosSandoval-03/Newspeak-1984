import type p5 from "p5";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Assets } from "../assets";
import {
  BLINK_FRAMES,
  CANVAS_WIDTH,
  DASH_FRAMES,
  DASH_INVULN_FRAMES,
  DASH_SPEED,
  ESCAPE_COOLDOWN_FRAMES,
  FREE_SPREAD_DEGREES,
  PLAYER_BULLET_SPEED,
  PLAYER_FIRE_COOLDOWN,
  PLAYER_HALF_SIZE,
  PLAYER_SPAWN,
  PLAYER_SPEED,
  PLAYFIELD_BOTTOM,
  RESPAWN_INVULN_FRAMES,
  WORD_MAX_LEVEL,
} from "../config";
import { Input } from "../core/Input";
import { resetGame, state } from "../state";
import type { Bullet } from "./Bullet";
import { Player } from "./Player";

// Each image is stood in for by its own name.
const images = new Proxy({}, { get: (_, name) => name }) as Assets["image"];

describe("Player", () => {
  let keys: EventTarget;
  let input: Input;
  let player: Player;
  let fired: Bullet[];

  // Node has no KeyboardEvent; a plain Event with a code is all Input reads.
  const hold = (...codes: string[]) => {
    for (const code of codes)
      keys.dispatchEvent(Object.assign(new Event("keydown"), { code }));
  };

  const release = (...codes: string[]) => {
    for (const code of codes)
      keys.dispatchEvent(Object.assign(new Event("keyup"), { code }));
  };

  // As the scene manager does, so a press counts on one tick only.
  const ticks = (n: number) => {
    for (let i = 0; i < n; i++) {
      player.update();
      input.endFrame();
    }
  };

  const tap = (code: string) => {
    hold(code);
    release(code);
  };

  beforeEach(() => {
    resetGame();
    keys = new EventTarget();
    input = new Input(keys);
    fired = [];
    player = new Player(input, images, (bullet) => fired.push(bullet));
  });

  it("starts at the bottom center", () => {
    expect(player.pos).toEqual(PLAYER_SPAWN);
  });

  it("moves at the same speed straight and diagonally", () => {
    hold("ArrowUp");
    ticks(1);
    expect(PLAYER_SPAWN.y - player.pos.y).toBeCloseTo(PLAYER_SPEED);

    hold("ArrowRight");
    const before = { ...player.pos };
    ticks(1);
    const moved = Math.hypot(player.pos.x - before.x, player.pos.y - before.y);
    expect(moved).toBeCloseTo(PLAYER_SPEED);
  });

  it("stays on screen and above the words row", () => {
    hold("ArrowLeft", "ArrowDown");
    ticks(500);
    expect(player.pos).toEqual({
      x: PLAYER_HALF_SIZE,
      y: PLAYFIELD_BOTTOM - PLAYER_HALF_SIZE,
    });

    // Blur releases every held key, so the opposite corner starts clean.
    keys.dispatchEvent(new Event("blur"));
    hold("ArrowRight", "ArrowUp");
    ticks(500);
    expect(player.pos).toEqual({
      x: CANVAS_WIDTH - PLAYER_HALF_SIZE,
      y: PLAYER_HALF_SIZE,
    });
  });

  it("fires single shots from the nose every cooldown while Shoot is held", () => {
    hold("Space");

    ticks(PLAYER_FIRE_COOLDOWN * 2 + 1);

    expect(fired).toHaveLength(3);
    expect(fired[0]).toMatchObject({
      owner: "player",
      pos: { x: PLAYER_SPAWN.x, y: PLAYER_SPAWN.y - PLAYER_HALF_SIZE },
      vel: { x: 0, y: -PLAYER_BULLET_SPEED },
    });
  });

  describe("with FREE", () => {
    const angles = () =>
      fired.map(({ vel }) =>
        Math.round((Math.atan2(vel.x, -vel.y) * 180) / Math.PI),
      );

    it("fires straight while the word sleeps, then wider with each upgrade", () => {
      hold("Space");

      FREE_SPREAD_DEGREES.forEach((spread, level) => {
        state.wordLevels.FREE = level;
        fired = [];
        ticks(PLAYER_FIRE_COOLDOWN);
        expect(angles()).toEqual(spread);
      });
      expect(FREE_SPREAD_DEGREES[0]).toEqual([0]);
    });

    it("keeps every bullet at full speed, from the nose", () => {
      state.wordLevels.FREE = WORD_MAX_LEVEL;
      hold("Space");
      ticks(1);

      for (const bullet of fired) {
        expect(Math.hypot(bullet.vel.x, bullet.vel.y)).toBeCloseTo(
          PLAYER_BULLET_SPEED,
        );
        expect(bullet.pos.y).toBe(PLAYER_SPAWN.y - PLAYER_HALF_SIZE);
      }
    });

    it("drops to a single shot the moment the word is gone", () => {
      state.wordLevels.FREE = 1;
      hold("Space");
      ticks(1);
      expect(fired).toHaveLength(3);
      state.words.delete("FREE");
      fired = [];

      ticks(PLAYER_FIRE_COOLDOWN);

      expect(angles()).toEqual([0]);
    });
  });

  describe("with ESCAPE", () => {
    // Halfway up, so no dash in any direction runs into an edge.
    beforeEach(() => {
      state.wordLevels.ESCAPE = 1;
      player.pos = { x: CANVAS_WIDTH / 2, y: 300 };
    });

    it("can't dash while the word sleeps, or once it is removed", () => {
      state.wordLevels.ESCAPE = 0;
      tap("KeyX");
      ticks(1);
      expect(player.invulnerable).toBe(false);

      state.wordLevels.ESCAPE = 1;
      state.words.delete("ESCAPE");
      tap("KeyX");
      ticks(1);
      expect(player.invulnerable).toBe(false);
    });

    it("bursts along the held direction, then flies at normal speed", () => {
      hold("ArrowRight", "ArrowUp");
      tap("ShiftLeft");
      const start = { ...player.pos };

      ticks(DASH_FRAMES);
      const burst = Math.hypot(player.pos.x - start.x, player.pos.y - start.y);
      expect(burst).toBeCloseTo(DASH_SPEED * DASH_FRAMES);
      expect(player.pos.x - start.x).toBeCloseTo(start.y - player.pos.y);

      const before = { ...player.pos };
      ticks(1);
      expect(
        Math.hypot(player.pos.x - before.x, player.pos.y - before.y),
      ).toBeCloseTo(PLAYER_SPEED);
    });

    it("goes forward when no direction is held", () => {
      tap("KeyX");
      ticks(DASH_FRAMES);

      expect(player.pos).toEqual({
        x: CANVAS_WIDTH / 2,
        y: 300 - DASH_SPEED * DASH_FRAMES,
      });
    });

    it("covers the pilot for longer than the burst lasts", () => {
      tap("KeyX");

      ticks(DASH_INVULN_FRAMES - 1);
      expect(player.invulnerable).toBe(true);
      ticks(1);
      expect(player.invulnerable).toBe(false);
    });

    it("waits out its cooldown, shorter at each upgrade", () => {
      for (let level = 1; level <= WORD_MAX_LEVEL; level++) {
        state.wordLevels.ESCAPE = level;
        player.pos = { x: CANVAS_WIDTH / 2, y: 300 };
        tap("KeyX");
        ticks(1);
        const cooldown = ESCAPE_COOLDOWN_FRAMES[level - 1];

        ticks(cooldown - 2);
        const y = player.pos.y;
        tap("KeyX");
        ticks(1);
        expect(player.pos.y, `level ${level}`).toBe(y);

        tap("KeyX");
        ticks(1);
        expect(player.pos.y, `level ${level}`).toBe(y - DASH_SPEED);
        ticks(DASH_FRAMES + cooldown);
      }
      expect(ESCAPE_COOLDOWN_FRAMES).toEqual(
        [...ESCAPE_COOLDOWN_FRAMES].sort((a, b) => b - a),
      );
    });

    it("tells the words row when the next dash is ready", () => {
      expect(player.dashReady).toBe(true);
      tap("KeyX");
      ticks(1);
      expect(player.dashReady).toBe(false);

      ticks(ESCAPE_COOLDOWN_FRAMES[0] - 1);
      expect(player.dashReady).toBe(false);
      ticks(1);
      expect(player.dashReady).toBe(true);
    });

    it("never blinks: the trail shows the dash instead", () => {
      const image = vi.fn();
      const p = {
        CENTER: "center",
        imageMode: () => {},
        image,
        drawingContext: {},
      } as unknown as p5;
      tap("KeyX");

      for (let i = 0; i < DASH_FRAMES; i++) {
        ticks(1);
        image.mockClear();
        player.draw(p);
        // The shadow, the ship, and one ghost per frame dashed so far, up to three.
        expect(image).toHaveBeenCalledTimes(2 + Math.min(i + 1, 3));
      }

      ticks(1);
      image.mockClear();
      player.draw(p);
      expect(image).toHaveBeenCalledTimes(2);
    });
  });

  it("holds fire without Shoot", () => {
    ticks(PLAYER_FIRE_COOLDOWN * 3);

    expect(fired).toHaveLength(0);
  });

  it("respawns at the bottom center, invulnerable for a while", () => {
    hold("ArrowLeft");
    ticks(10);

    player.respawn();
    expect(player.pos).toEqual(PLAYER_SPAWN);
    expect(player.invulnerable).toBe(true);

    ticks(RESPAWN_INVULN_FRAMES);
    expect(player.invulnerable).toBe(false);
  });

  it("blinks while invulnerable, and only then", () => {
    const image = vi.fn();
    const p = {
      CENTER: "center",
      imageMode: () => {},
      image,
      drawingContext: {},
    } as unknown as p5;
    const drawnOver = (frames: number) => {
      image.mockClear();
      for (let i = 0; i < frames; i++) {
        player.update();
        player.draw(p);
      }
      // Each visible frame draws the shadow and the ship.
      return image.mock.calls.length / 2;
    };

    player.respawn();
    expect(drawnOver(BLINK_FRAMES * 4)).toBe(BLINK_FRAMES * 2);

    ticks(RESPAWN_INVULN_FRAMES);
    expect(drawnOver(BLINK_FRAMES * 4)).toBe(BLINK_FRAMES * 4);
  });
});
