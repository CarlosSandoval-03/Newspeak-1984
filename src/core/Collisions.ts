import type { Vec } from "../types";

type Circle = { pos: Vec; radius: number };

// Squared distances, so no square root on the hottest path of the frame.
export function circlesOverlap(a: Circle, b: Circle): boolean {
  const dx = a.pos.x - b.pos.x;
  const dy = a.pos.y - b.pos.y;
  const reach = a.radius + b.radius;

  return dx * dx + dy * dy < reach * reach;
}
