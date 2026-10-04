# Newspeak 1984 — Project Context

## Overview
A vertical scrolling shoot 'em up inspired by Capcom's *1942*, reimagined with a dystopian theme based on Orwell's *1984*. The player is a Party pilot who may eventually defect. The theme must be expressed through mechanics, not only visuals.

## Communication
- Talk to me in Spanish.
- All code, comments, identifiers, file names, and commit messages in English.

## Stack
- TypeScript (strict mode)
- Vite (vanilla-ts template)
- p5.js in **instance mode** only (`new p5(sketch)`); never global mode
- No other runtime dependencies unless I approve them

## Project structure
```
newspeak-1984/
├── index.html
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json          # strict; vite/client types loaded here (no vite-env.d.ts)
├── README.md              # game overview + how to run (OSS style)
├── .npmrc                 # save-exact=true: dependencies pinned to exact versions
├── docs/implementation-plan.md  # step-by-step spec: what to build and when it is done
├── public/assets/{fonts,sprites,sounds}/
└── src/
    ├── main.ts            # creates the p5 instance, delegates to SceneManager
    ├── style.css
    ├── config.ts          # constants: palette, canvas size, thresholds, rates, word removal order
    ├── state.ts           # global game state + resetLevelState()
    ├── types.ts           # shared interfaces and types
    ├── core/              # Scene, SceneManager, Input, Collisions (theme-agnostic)
    ├── entities/          # Entity (base), Player, Bullet, Enemy, Eye, Boss, Pickup
    ├── systems/           # Suspicion, Newspeak, Propaganda, Ministry, Spawner
    ├── levels/            # levels.ts (data-driven level definitions), Background
    ├── ui/                # HUD, Ticker, effects (scanlines, glitch, typewriter)
    └── scenes/            # Menu, Dictionary, Game, Ministry, Ending
```

## Architecture rules
- `main.ts` stays minimal: setup/draw delegate to `SceneManager`.
- Scenes implement `enter()`, `update()`, `draw()`, `exit()`.
- Entities extend `Entity` (pos, vel, radius, alive, update, draw).
- Pass the p5 instance explicitly (constructor or method parameter); no globals for p5.
- Levels are **data**, not code: waves, eye positions, diary location, boss.
- All tunable numbers live in `config.ts`.
- The HUD never reads real state directly; it always goes through `Propaganda`.
- Use `p5.Graphics` (createGraphics) for the scrolling background.

## Global state (shape)
```ts
{
  suspicion: number;          // 0–100
  alertLevel: 0 | 1 | 2;      // normal, alert, pursuit
  words: Set<Word>;           // "FREE" | "ESCAPE" | "TRUTH" | "REMEMBER"
  realLives: number;
  realScore: number;
  stats: { kills: number; eyesDestroyed: number; framesSeen: number; diaries: number };
  level: number;
}
```

## Core mechanics

### 1. Surveillance Eyes & Suspicion
- Eyes: fixed towers and patrolling drones with a vision cone (position, facing angle, aperture ~45°, range, sinusoidal sweep).
- Detection: distance < range AND normalized angle difference (`atan2(sin(d), cos(d))`) < aperture/2.
- Suspicion rises while detected (0.3–1.2/frame, faster when closer); decays at 0.05/frame when unseen. Count `framesSeen`.
- Thresholds: 0–33 normal; 34–66 alert (+30% spawn rate, more enemy fire); 67–99 pursuit (homing enemies); 100 triggers the **Thought Police** elite wave/mini-boss, after which suspicion resets to 50.
- Destroying an Eye is allowed but adds +15 suspicion instantly.
- Cone drawn with `arc(..., PIE)`: grey when idle, red when detecting.

### 2. Newspeak (words as power-ups)
- FREE: triple spread shot (otherwise single shot)
- ESCAPE: short dash with 0.5s invulnerability, on cooldown
- TRUTH: shows the real HUD and reveals camouflaged enemies
- REMEMBER: one screen-clearing bomb per level
- Removal order (one per level, from level 2): FREE → ESCAPE → REMEMBER → TRUTH.
- Word pickups: if the word exists, it upgrades that ability; if removed, it appears crossed out, gives nothing, and adds +10 suspicion.
- One hidden **diary** per level restores a removed word for that level only, at +25 suspicion. Count `diaries`.

### 3. Doublethink (lying HUD)
- `Propaganda` exposes `displayedLives()`, `displayedScore()`, `apparentColor(enemy)`, and whether each value is currently false.
- Lies escalate by level: alliance ticker flips → inflated score → intermittent fake extra life → enemies shown in "allied" color that still shoot.
- Fairness rule: every false value gets a subtle tell (flicker / 1px jitter). TRUTH disables all lies.

### 4. Ministry of Truth (score rewrite)
- End-of-level scene: show real score, cross it out, typewriter in the official score.
- `officialScore = realScore * obedienceFactor`, where the factor rises with kills and falls with eyes destroyed, time seen, and diaries read; clamped to [0.1, 2.0]. Weights in `config.ts`.
- Show bureaucratic "corrections" list.
- High score table (localStorage, wrapped in try/catch) whose past entries may be altered or erased.
- The real score is tracked silently and only revealed in the rebel ending.

### 5. Aesthetics
- Palette: background #1a1a1a, greys #3a3a3a / #7a7a7a, text #e8e4d8, single institutional red #b3261e reserved for the regime.
- Propaganda posters and telescreens in the background (original slogans only).
- Glitch intensity proportional to suspicion (copy/offset horizontal slices); scanlines overlay.
- Monospaced / typewriter font for all regime text.

## Game flow
Menu → Dictionary (announces and strikes the removed word) → Game → Ministry → Dictionary (next level) … → Ending (obedient or rebel).

## Implementation order
1. Core shmup: movement, shooting, enemies, collisions, scrolling, scene system
2. Eyes + Suspicion
3. Newspeak
4. Ministry of Truth
5. Propaganda HUD + glitch effects

Keep the game playable after every step. Full spec per step, with acceptance criteria and open decisions: [docs/implementation-plan.md](docs/implementation-plan.md).

## Current status
- Project scaffolded with Vite (vanilla-ts), p5 2.x installed, pnpm as package manager, Vite template removed.
- Folder structure defined; files not yet implemented. `main.ts` only imports `style.css`.

## How to work with me
- Before large changes, briefly explain the plan and which files you'll touch.
- Work in small, playable increments.
- Run `pnpm typecheck` after changes and fix all type errors.
- Don't add dependencies or change the architecture without asking.

## Git & versioning
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/): `<type>(<scope>): <summary>`, imperative, lowercase, no trailing period.
  - Types: `feat`, `fix`, `refactor`, `perf`, `style`, `docs`, `test`, `build`, `chore`.
  - Scope is optional. Allowed scopes are the source folders (`core`, `entities`, `systems`, `levels`, `ui`, `scenes`), plus `config`, `state`, `deps`, and `release`.
  - The header is 72 characters or fewer, with a blank line before the body.
  - Breaking changes: `!` after the type/scope plus a `BREAKING CHANGE:` footer.
- One logical change per commit; the game must typecheck and run at every commit.
- These rules are enforced by the git hooks in `.githooks/`: `commit-msg` checks the message, and `pre-commit` runs `pnpm typecheck`. `pnpm install` activates them through the `prepare` script, which sets `core.hooksPath`. Never bypass them with `--no-verify`.
- The project version lives in `package.json` and follows [SemVer](https://semver.org/):
  - While in `0.x`: each completed implementation step bumps the minor version (`0.1.0` → `0.2.0`), and fixes bump the patch version.
  - `1.0.0` is the first release where the full game is playable through both endings.
- Version bumps go in their own commit (`chore(release): vX.Y.Z`) with a matching annotated tag `vX.Y.Z`.
- Dependencies are pinned to exact versions (`.npmrc` has `save-exact=true`).
- Never push. No `git push` of branches or tags, and no changes to remotes. Commits and tags stay local; only I push.

## Roles
- I implement the game myself, following [docs/implementation-plan.md](docs/implementation-plan.md), starting with step 1.
- Don't write or modify game code in `src/` unless I explicitly ask for it. Your role is to explain the plan, answer questions, review my code against the plan and these rules, and help with debugging.
- When I change a decision from the plan's "Decisions to confirm" table, update the plan so it stays the source of truth.