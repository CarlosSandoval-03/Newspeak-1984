import { CANVAS_WIDTH } from "../src/config";
import { Enemy } from "../src/entities/Enemy";
import { Explosion } from "../src/entities/Explosion";
import { Eye } from "../src/entities/Eye";
import type { GameScene } from "../src/scenes/GameScene";
import { state } from "../src/state";

export interface Pilot {
  hold(code: string): void;
  release(code: string): void;
}

export interface Scenario {
  description: string;
  frames: number;
  setup?(scene: GameScene, pilot: Pilot): void;
  // Runs before every tick, warm-up included.
  step?(scene: GameScene, frame: number, pilot: Pilot): void;
}

// A pilot who never shoots and keeps moving, so enemies live long and fire at a moving target,
// the way a player dodging them would. Lives are held so the run never ends in a game over.
function weave(frame: number, pilot: Pilot): void {
  state.realLives = 9;
  if (frame % 72 !== 0) return;
  const right = (frame / 72) % 2 === 0;
  pilot.release(right ? "ArrowLeft" : "ArrowRight");
  pilot.hold(right ? "ArrowRight" : "ArrowLeft");
}

// Brackets reach the scene's private lists, as the tests do, so the game needs no hooks for this.
export const SCENARIOS: Record<string, Scenario> = {
  level1: {
    description: "Level 1 as played: waves, eyes, turrets, the city scrolling",
    frames: 1800,
    step: (_, frame, pilot) => weave(frame, pilot),
  },

  "level1-spread": {
    description: "Level 1 with FREE at its maximum, firing all the time",
    frames: 1800,
    setup: (_, pilot) => {
      state.wordLevels.FREE = 3;
      pilot.hold("Space");
    },
    step: (_, frame, pilot) => weave(frame, pilot),
  },

  pursuit: {
    description: "Suspicion held at 80: reinforcements, faster fire, autogyros",
    frames: 1800,
    step: (scene, frame, pilot) => {
      weave(frame, pilot);
      if (state.suspicion < 80) scene["suspicion"].add(80 - state.suspicion);
    },
  },

  "thought-police": {
    description:
      "The Thought Police and escort at full suspicion, an eye on the pilot, the red vignette",
    frames: 1800,
    setup: (scene) => {
      scene["eyes"].push(
        new Eye(
          {
            type: "drone",
            at: 0,
            x: 0,
            path: "sine",
            facing: 90,
            range: 300,
            sweepAmp: 0,
            sweepSpeed: 0,
            aperture: 90,
          },
          { x: 0, y: 0 },
          scene["images"],
        ),
      );
    },
    step: (scene, frame, pilot) => {
      weave(frame, pilot);
      const { pos } = scene["player"];
      for (const eye of scene["eyes"])
        if (eye.type === "drone") eye.pos = { x: pos.x, y: pos.y - 150 };
      if (!scene["police"]) scene["suspicion"].add(100);
    },
  },

  "bullet-storm": {
    description:
      "Stress: 30 fighters and bombers on screen at all times, every one firing",
    frames: 1200,
    step: (scene, frame, pilot) => {
      weave(frame, pilot);
      const enemies = scene["enemies"];
      while (enemies.length < 30)
        enemies.push(
          new Enemy(
            enemies.length % 3 === 0 ? "bomber" : "straight",
            { x: 40 + Math.random() * (CANVAS_WIDTH - 80), y: -24 },
            () => scene["player"].pos,
            scene["images"],
            scene["fire"],
          ),
        );
    },
  },

  explosions: {
    description: "Stress: eight explosions every 6 frames",
    frames: 900,
    step: (scene, frame, pilot) => {
      weave(frame, pilot);
      if (frame % 6 !== 0) return;
      for (let i = 0; i < 8; i++)
        scene["explosions"].push(
          new Explosion(
            { x: Math.random() * CANVAS_WIDTH, y: Math.random() * 600 },
            48,
          ),
        );
    },
  },

  "fast-scroll": {
    description:
      "The city alone, scrolling 24 times faster, to time building its chunks",
    frames: 900,
    step: (scene) => {
      state.realLives = 9;
      scene["scroll"] += 23;
      scene["enemies"] = [];
      scene["eyes"] = [];
      scene["turrets"] = [];
      scene["bullets"] = [];
    },
  },
};
