export const CANVAS_WIDTH = 480;
export const CANVAS_HEIGHT = 640;
export const INK = "#1a1a1a";
export const CONCRETE = "#3a3a3a";
export const STEEL = "#7a7a7a";
export const PAPER = "#e8e4d8";

// Red belongs to the regime: nothing the player owns may use it.
export const RED_DARK = "#6e1712";
export const RED = "#b3261e";
export const RED_LIGHT = "#e0503a";

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
