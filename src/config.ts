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

// The words row starts below this, so the ship never hides under it.
export const PLAYFIELD_BOTTOM = 588;

// The player's sprite is 48 px; clamping by half keeps all of it on screen.
export const PLAYER_HALF_SIZE = 24;
// The hitbox is the cockpit, not the wings, so near misses feel fair.
export const PLAYER_RADIUS = 5;
export const PLAYER_SPEED = 3;
export const PLAYER_FIRE_COOLDOWN = 6;
export const PLAYER_SPAWN = { x: CANVAS_WIDTH / 2, y: 540 };
export const PLAYER_BULLET_SPEED = 8;
export const BULLET_RADIUS = 3;

// Fakes altitude, like 1942: the shadow falls down and to the right.
export const SHADOW_OFFSET = { x: 6, y: 10 };
export const SHADOW_ALPHA = 0.4;
