import type p5 from "p5";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Assets } from "../assets";
import {
  BLINK_FRAMES,
  CANVAS_WIDTH,
  PLAYER_BULLET_SPEED,
  PLAYER_FIRE_COOLDOWN,
  PLAYER_HALF_SIZE,
  PLAYER_SPAWN,
  PLAYER_SPEED,
  PLAYFIELD_BOTTOM,
  RESPAWN_INVULN_FRAMES,
} from "../config";
import { Input } from "../core/Input";
import type { Bullet } from "./Bullet";
import { Player } from "./Player";

// Each image is stood in for by its own name.
const images = new Proxy({}, { get: (_, name) => name }) as Assets["image"];

describe("Player", () => {
  let keys: EventTarget;
  let player: Player;
  let fired: Bullet[];

  // Node has no KeyboardEvent; a plain Event with a code is all Input reads.
  const hold = (...codes: string[]) => {
    for (const code of codes)
      keys.dispatchEvent(Object.assign(new Event("keydown"), { code }));
  };

  const ticks = (n: number) => {
    for (let i = 0; i < n; i++) player.update();
  };

  beforeEach(() => {
    keys = new EventTarget();
    fired = [];
    player = new Player(new Input(keys), images, (bullet) =>
      fired.push(bullet),
    );
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

  it("fires from the nose every cooldown while Shoot is held", () => {
    hold("Space");

    ticks(PLAYER_FIRE_COOLDOWN * 2 + 1);

    expect(fired).toHaveLength(3);
    expect(fired[0]).toMatchObject({
      owner: "player",
      pos: { x: PLAYER_SPAWN.x, y: PLAYER_SPAWN.y - PLAYER_HALF_SIZE },
      vel: { x: 0, y: -PLAYER_BULLET_SPEED },
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
