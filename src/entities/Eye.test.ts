import type p5 from "p5";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Assets } from "../assets";
import {
  CANVAS_HEIGHT,
  DRONE_PATROL_PERIOD,
  DRONE_PATROL_REACH,
  DRONE_SPEED,
  EYE_STATS,
  HIT_FLASH_FRAMES,
  RED,
  SCROLL_SPEED,
  STEEL,
} from "../config";
import type { EyeDef, Vec } from "../types";
import { Eye } from "./Eye";

// Each image is stood in for by its own name, so a draw call says which sprite it used.
const images = new Proxy({}, { get: (_, name) => name }) as Assets["image"];

const cone = { range: 100, sweepAmp: 0, sweepSpeed: 0.05 };
const tower = (facing: number, extra: Partial<EyeDef> = {}) =>
  new Eye(
    { type: "tower", at: 0, on: "street", facing, ...cone, ...extra } as EyeDef,
    { x: 240, y: 300 },
    images,
  );
const drone = (path: "patrol" | "sine") =>
  new Eye(
    { type: "drone", at: 0, x: 240, path, facing: 90, ...cone },
    { x: 240, y: 100 },
    images,
  );

// A point `distance` px from (240, 300), in the direction `degrees`.
const toward = (degrees: number, distance = 50): Vec => ({
  x: 240 + Math.cos((degrees * Math.PI) / 180) * distance,
  y: 300 + Math.sin((degrees * Math.PI) / 180) * distance,
});

const ticks = (eye: Eye, n: number) => {
  for (let i = 0; i < n; i++) eye.update();
};

describe("Eye", () => {
  beforeEach(() => {
    // Phase 0: the sweep starts on `facing`.
    vi.spyOn(Math, "random").mockReturnValue(0);
  });

  it("sees inside its aperture and range, and nowhere else", () => {
    const eye = tower(90);

    expect(eye.sees(toward(90))).toBe(true);
    expect(eye.sees(toward(90 + 22))).toBe(true);
    expect(eye.sees(toward(90 - 22))).toBe(true);
    expect(eye.sees(toward(90 + 23))).toBe(false);
    expect(eye.sees(toward(90 - 23))).toBe(false);
    expect(eye.sees(toward(90, 99))).toBe(true);
    expect(eye.sees(toward(90, 101))).toBe(false);
    expect(eye.sees(toward(-90))).toBe(false);
  });

  it("sees across the ±180° seam", () => {
    const left = tower(180);
    const nearSeam = tower(-170);

    expect(left.sees(toward(179))).toBe(true);
    expect(left.sees(toward(-179))).toBe(true);
    expect(left.sees(toward(150))).toBe(false);
    expect(nearSeam.sees(toward(175))).toBe(true);
    expect(nearSeam.sees(toward(-140))).toBe(false);
  });

  it("takes its aperture from the level data", () => {
    const wide = tower(90, { aperture: 90 });

    expect(wide.sees(toward(90 + 44))).toBe(true);
    expect(wide.sees(toward(90 + 46))).toBe(false);
  });

  it("sweeps its cone around `facing`, as far as `sweepAmp`", () => {
    const eye = tower(90, { sweepAmp: 30 });
    const angles: number[] = [];

    for (let i = 0; i < 200; i++) {
      angles.push((eye.angle * 180) / Math.PI);
      eye.update();
    }

    expect(angles[0]).toBeCloseTo(90);
    expect(Math.max(...angles)).toBeCloseTo(120, 1);
    expect(Math.min(...angles)).toBeCloseTo(60, 1);
  });

  it("scrolls a tower down with the ground", () => {
    const eye = tower(90);

    ticks(eye, 10);

    expect(eye.pos).toEqual({ x: 240, y: 300 + 10 * SCROLL_SPEED });
  });

  it("flies a drone's patrol at an even speed, and its sine path smoothly", () => {
    const patrol = drone("patrol");
    const sine = drone("sine");

    ticks(patrol, DRONE_PATROL_PERIOD / 8);
    ticks(sine, DRONE_PATROL_PERIOD / 8);

    // An eighth of the way round: the patrol is halfway out, the sine path further.
    expect(patrol.pos.x).toBeCloseTo(240 + DRONE_PATROL_REACH / 2);
    expect(sine.pos.x).toBeCloseTo(240 + DRONE_PATROL_REACH * Math.SQRT1_2);
    expect(patrol.pos.y).toBeCloseTo(
      100 + (DRONE_PATROL_PERIOD / 8) * DRONE_SPEED,
    );

    const xs: number[] = [];
    for (let i = 0; i < DRONE_PATROL_PERIOD; i++) {
      patrol.update();
      xs.push(patrol.pos.x);
    }
    expect(Math.max(...xs)).toBeCloseTo(240 + DRONE_PATROL_REACH);
    expect(Math.min(...xs)).toBeCloseTo(240 - DRONE_PATROL_REACH);
  });

  it("is destroyed only by the hit that empties its hp, and flashes before that", () => {
    const image = vi.fn();
    const p = new Proxy(
      { CENTER: "center", PIE: "pie", drawingContext: {}, image },
      {
        get: (target, key) =>
          key in target ? target[key as keyof typeof target] : () => {},
      },
    ) as unknown as p5;
    const eye = tower(90);

    for (let i = 1; i < EYE_STATS.tower.hp; i++) expect(eye.hit()).toBe(false);
    eye.draw(p);
    expect(image.mock.calls.at(-1)?.[0]).toBe("eye-tower-flash");

    ticks(eye, HIT_FLASH_FRAMES);
    eye.draw(p);
    expect(image.mock.calls.at(-1)?.[0]).toBe("eye-tower");

    expect(eye.hit()).toBe(true);
    expect(eye.alive).toBe(false);
    expect(eye.hit()).toBe(false);
  });

  it("turns its cone red only while detecting", () => {
    const fills: unknown[] = [];
    const p = new Proxy(
      {
        CENTER: "center",
        PIE: "pie",
        drawingContext: {},
        fill: (c: unknown) => fills.push(c),
      },
      {
        get: (target, key) =>
          key in target ? target[key as keyof typeof target] : () => {},
      },
    ) as unknown as p5;
    const eye = tower(90);

    eye.draw(p);
    expect(fills[0]).toBe(STEEL);

    fills.length = 0;
    eye.detecting = true;
    eye.draw(p);
    expect(fills[0]).toBe(RED);
  });

  it("is gone once it has scrolled off the bottom", () => {
    const eye = tower(90);
    const half = EYE_STATS.tower.halfSize;

    ticks(eye, (CANVAS_HEIGHT + half - 300) / SCROLL_SPEED);
    expect(eye.alive).toBe(true);

    eye.update();
    expect(eye.alive).toBe(false);
  });
});
