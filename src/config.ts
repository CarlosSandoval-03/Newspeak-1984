export const CANVAS_WIDTH = 480;
export const CANVAS_HEIGHT = 640;
export const INK = "#1a1a1a";

// KeyboardEvent.code, so the bindings stay put on AZERTY or Dvorak layouts.
export const KEYS = {
  up: ["ArrowUp", "KeyW"],
  down: ["ArrowDown", "KeyS"],
  left: ["ArrowLeft", "KeyA"],
  right: ["ArrowRight", "KeyD"],
  shoot: ["Space", "KeyZ"],
  dash: ["KeyX", "ShiftLeft", "ShiftRight"],
  bomb: ["KeyC"],
  truth: ["KeyV"],
  confirm: ["Enter"],
  pause: ["KeyP", "Escape"],
} as const;

export const TICK_MS = 1000 / 60;
// Past this, a slow machine slows the game down instead of catching up in bursts.
export const MAX_UPDATES_PER_FRAME = 2;

export const STARTING_LIVES = 3;
