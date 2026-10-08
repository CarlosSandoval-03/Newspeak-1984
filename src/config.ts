import type { EnemyKind, EyeType } from "./types";

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
// The game keeps running this long after the last life: the plane goes down and the world flies on.
export const GAME_OVER_DELAY = 120;
// The telescreen cuts the broadcast, collapsing the picture to a line, then a dot.
export const SIGNAL_OFF_FRAMES = 30;
export const PHOTO_FADE_FRAMES = 30;
// Counted from when the photo starts to appear.
export const STAMP_DELAY = 45;
export const GAME_OVER_TEXT_DELAY = 30;

export const SCROLL_SPEED = 1;

// The city is cut into chunks taller than the screen, so at most two are ever on it.
export const CELL_SIZE = 32;
export const CHUNK_HEIGHT = 1024;
export const MIN_BLOCK_CELLS = 4;
export const MAX_BLOCK_CELLS = 7;
export const BUILDING_CHANCE = 0.8;
export const SKYLIGHT_CHANCE = 0.3;
export const BANNER_CHANCE = 0.25;
export const LAMP_CHANCE = 0.4;
// Vents, hatches, and tanks per 16 px slot of roof.
export const FIXTURE_DENSITY = 0.04;
// Each lamp is on for this many frames, then off as long.
export const LAMP_BLINK_FRAMES = 40;
// crater.png's size, which the layout keeps clear of curbs and chunk edges.
export const CRATER_SIZE = 48;
export const CRATER_CHANCE = 0.04;

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
export const RESPAWN_INVULN_FRAMES = 120;
// The ship is hidden every other stretch of this many frames while invulnerable.
export const BLINK_FRAMES = 4;
export const BULLET_RADIUS = 3;

// Fakes altitude, like 1942: the shadow falls down and to the right.
export const SHADOW_OFFSET = { x: 6, y: 10 };
export const SHADOW_ALPHA = 0.4;

// halfSize is half the sprite, so an enemy enters and leaves fully off screen.
export const ENEMY_STATS: Record<
  EnemyKind,
  { halfSize: number; radius: number; hp: number; score: number; speed: number }
> = {
  straight: { halfSize: 24, radius: 12, hp: 1, score: 100, speed: 2 },
  sine: { halfSize: 24, radius: 12, hp: 1, score: 100, speed: 2 },
  bomber: { halfSize: 32, radius: 20, hp: 6, score: 500, speed: 1 },
};
export const SINE_AMPLITUDE = 40;
export const SINE_PERIOD = 120;
export const ENEMY_BULLET_SPEED = 3;
export const ENEMY_FIRE_INTERVAL = 90;
// Spreads a wave's shots out, so its enemies don't all fire on the same frame.
export const ENEMY_FIRE_JITTER = 30;
export const BOMBER_FIRE_INTERVAL = 120;
export const BOMBER_FAN_COUNT = 5;
export const BOMBER_FAN_SPREAD_DEGREES = 60;
export const HIT_FLASH_FRAMES = 3;

export const EXPLOSION_FRAMES = 20;
export const EXPLOSION_PARTICLES = 8;

// Eyes neither shoot nor score: shooting one down only draws the regime's attention.
export const EYE_STATS: Record<
  EyeType,
  { halfSize: number; radius: number; hp: number }
> = {
  tower: { halfSize: 24, radius: 16, hp: 4 },
  drone: { halfSize: 16, radius: 12, hp: 2 },
};
export const EYE_APERTURE_DEGREES = 45;
// Shooting an eye down is noticed at once.
export const EYE_DESTROYED_SUSPICION = 15;
// Slower than the ground, so a drone drifts down the screen as it patrols.
export const DRONE_SPEED = 0.5;
// How far a drone strays either side of its x, and how long one full patrol takes.
export const DRONE_PATROL_REACH = 80;
export const DRONE_PATROL_PERIOD = 240;
// Faint enough to see the bullets through, with a firmer edge so the cone's reach reads.
export const CONE_FILL_ALPHA = 0.15;
export const CONE_EDGE_ALPHA = 0.5;

// Per frame while seen: fastest point-blank, slowest at the tip of the cone.
export const SUSPICION_RISE_NEAR = 1.2;
export const SUSPICION_RISE_FAR = 0.3;
export const SUSPICION_DECAY = 0.05;
export const SUSPICION_MAX = 100;
// Where each alert level begins; the Thought Police come only at the very top.
export const ALERT_THRESHOLDS = {
  alert: 34,
  pursuit: 67,
  thoughtPolice: SUSPICION_MAX,
} as const;
