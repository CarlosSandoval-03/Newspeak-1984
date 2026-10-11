import type { Vec } from "../types";

export const radians = (degrees: number) => (degrees * Math.PI) / 180;

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

// Starts and ends at rest, for motion that must not jerk: a climb, a touchdown.
export function smoothstep(t: number): number {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

// Radians, clockwise from pointing right, since screen y grows downward.
export function angleTo(from: Vec, to: Vec): number {
  return Math.atan2(to.y - from.y, to.x - from.x);
}

// Into (-π, π], so an angle just past the ±180° seam still reads as a small turn.
export function wrapAngle(angle: number): number {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

export function velocity(angle: number, speed: number): Vec {
  return { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed };
}

// `count` angles spread evenly over `width` radians, centered on `center`; one alone points at it.
export function fan(center: number, count: number, width: number): number[] {
  if (count === 1) return [center];

  const step = width / (count - 1);
  return Array.from({ length: count }, (_, i) => center - width / 2 + i * step);
}
