# Technical Reference

Stack, architecture, conventions, rendering, and tooling: how the code is built. How to run the project: [README](../README.md).

## Stack

| Tool | Version | Notes |
| ---- | ------- | ----- |
| TypeScript | 6.0.3 | `strict`; `vite/client` types come from `tsconfig.json` (no `vite-env.d.ts`). |
| Vite | 8.3.2 | `vanilla-ts`; serves `public/` at the site root. |
| p5.js | 2.3.4 | **Instance mode only** (`new p5(sketch)`). |
| pnpm | 12.3.4 | Pinned via `packageManager`. |
| Node.js | ≥ 22.12 | Required by Vite 8. |

Dependencies are pinned exactly (`.npmrc`: `save-exact=true`). No new runtime dependency without approval.

## Project structure

```
newspeak-1984/
├── index.html            # page shell; links public/favicon.png
├── package.json          # scripts, exact dependency versions, packageManager
├── pnpm-lock.yaml
├── tsconfig.json
├── .npmrc                # save-exact=true
├── .githooks/            # commit-msg, pre-commit
├── README.md             # project overview and how to run it
├── docs/                 # this documentation (start at docs/README.md)
├── public/
│   ├── favicon.png
│   └── assets/
│       ├── fonts/        # VT323, Courier Prime + OFL licenses
│       ├── illustrations/ # scene art
│       ├── sprites/      # gameplay sprites, landmarks, tilesets (+ .json), damage maps (.json), variants/
│       └── sounds/       # (empty)
└── src/
    ├── main.ts           # creates the p5 instance, delegates to SceneManager
    ├── style.css         # page styles (canvas centering, background)
    ├── config.ts         # every tunable number
    ├── state.ts          # global game state + resetLevelState()
    ├── types.ts          # shared types
    ├── i18n/             # en.ts, es.ts (all player-facing text), index.ts (detection, t())
    ├── core/             # Scene, SceneManager, Input, Collisions (theme-agnostic)
    ├── entities/         # Entity, Player, Bullet, Enemy, Eye, Boss, Pickup
    ├── systems/          # Suspicion, Newspeak, Propaganda, Ministry, Spawner
    ├── levels/           # levels.ts (level data), Background
    ├── ui/               # HUD, Ticker, effects (scanlines, glitch, typewriter)
    └── scenes/           # Menu, Dictionary, Game, Ministry, Ending
```

## Code conventions

- **Language:** all code, comments, identifiers, file names, and commit messages are in English. Player-facing text lives in `src/i18n/` (English and Spanish).
- **Every player-facing string comes from `src/i18n/`**, never inline; `es.ts` is typed against `en.ts`, so edit both together.

## Architecture

- **`main.ts` is minimal:** `setup` and `draw` only create and call the `SceneManager`.
- **Scenes** implement `enter()`, `update()`, `draw()`, `exit()`. `SceneManager.change(next)` calls `exit()` then `enter()`.
- **Entities** extend `Entity` (`pos`, `vel`, `radius`, `alive`, `update()`, `draw(p)`).
- **The p5 instance is passed explicitly**, never stored globally.
- **`core/` is theme-agnostic:** scenes, input, circles; nothing about 1984.
- **The HUD never reads real state.** It asks `Propaganda` (`displayedLives()`, `displayedScore()`, `apparentColor()`, `isLying()`), a pass-through until the lies exist.
- **Levels are data, not code:** waves, eyes, turrets, pickups, diary location, boss, and terrain.
- **The scrolling background is drawn into `p5.Graphics`** (see [Background](#background)).

| Value | Lives in |
| ----- | -------- |
| Tunable numbers (speeds, rates, thresholds, colors, sizes, weights) | `config.ts` |
| Persistent state (lives, score, suspicion, words, stats, level) | `state.ts` |
| Shared types | `types.ts` |
| Level content (waves, eyes, pickups, diary, boss), as plain data | `levels/levels.ts` |
| Per-frame entity lists | `GameScene` fields |

### Global state

The shape of `state` in `state.ts` (step 1 creates it; later steps extend it, for example with `runStats` for the whole run):

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

## Runtime conventions

- **Time is in frames.** `p.frameRate(60)`, one tick per `draw()`, no `deltaTime`. Seconds are converted in `config.ts` (`0.5 s` → `30`). Slow machines slow the game down instead of skipping frames, like arcade hardware.
- **Canvas:** 480 × 640, centered, unscaled. `(0, 0)` is top-left; `y` grows downward.
- **Level coordinates** are scroll distance: something at `at: 1200` enters at the top edge once the background has scrolled 1200 px.
- **Vectors:** a plain `Vec = { x, y }` instead of `p5.Vector`, which keeps `core/` free of p5. Collisions compare squared distances: `dx*dx + dy*dy < (ra + rb)^2`.
- **Input:** keys by `KeyboardEvent.code` (layout-independent), with `preventDefault()` on game keys so arrows and Space don't scroll the page. Bindings: [gameplay.md › Controls](gameplay.md#controls), mirrored in `config.ts`.

## Rendering

### Loading

p5 2.x has no `preload()`. `await` every asset once in an async setup:

```ts
p.setup = async () => {
  const player = await p.loadImage('assets/sprites/player.png');
  const machineFont = await p.loadFont('assets/fonts/VT323-Regular.ttf');
};
```

### Sprites

- `p.noSmooth()` once; draw at integer positions with `p.imageMode(p.CENTER)`. Never scale by a non-integer factor.
- **Never call `tint()` per frame:** the 2D renderer rebuilds a recolored image on every call. Use `sprites/variants/` ([assets.md › Variants](assets.md#variants-spritesvariants)).
- Transparency (camouflage, shadows): set `p.drawingContext.globalAlpha`, then restore it.
- Mirroring and 90° rotations are free canvas transforms. Other angles make pixel art jagged, so aircraft face straight up or down, and parts that must aim or spin (AA barrels, gyro rotor) are p5 lines ([assets.md › p5 additions](assets.md#assets-that-need-p5-additions)).

### Text

- All player-facing text comes from `src/i18n/` through `t(path, params)`; language detection runs once at startup. Files, placeholders, and the detection order: [text-and-language.md › Translation files](text-and-language.md#translation-files).
- Fonts, sizes, colors, strike-throughs, and the typewriter reveal: [text-and-language.md › Typography](text-and-language.md#typography).
- Canvas text is always antialiased, regardless of `noSmooth()`; that's fine at those sizes.
- Measure with `p.textWidth()` and wrap long paragraphs: Spanish runs about 20% longer than English.

### Background

The background is prerendered into `p5.Graphics` **chunks**, 480 px wide and taller than the canvas. A chunk is built when the scroll reaches it, and each frame draws only the current and next chunk: two `image()` calls, however much a chunk holds.

Layers per chunk:

1. **Ground (Wang tiles).** Store terrain on tile *corners* (`asphalt`, `plaza`, `rubble`). For each 32×32 cell, find the tile whose `corners` match (`lower` = asphalt, `upper` = plaza or rubble) and copy its rect. A cell mixes asphalt with only *one* other terrain, so keep asphalt between plazas and rubble.
2. **Decals:** a few `crater.png` on asphalt.
3. **Buildings:** procedural rooftops on part of the plazas.
4. **Landmarks and messages:** the level's ministry, rooftop murals, ground slogans.

**Text is not baked into chunks.** Draw changing slogans each frame at their scrolled position, or redraw only that region when the text flips. Towed banners move, so they are drawn every frame.

Keep the ground dark (`#1a1a1a` asphalt, `#3a3a3a` plazas and rubble) so moving sprites (`#7a7a7a`, `#e8e4d8`) always stand out.

### Progressive damage

Bosses show damage hole by hole, driven by code and two assets per boss: `boss-*-damaged.png` (fully wrecked) and `boss-*-damage.json`:

```json
{ "sprite": "boss-fortress.png", "damaged": "boss-fortress-damaged.png",
  "regions": [{ "x": 19, "y": 54, "w": 22, "h": 19 }, …] }
```

1. At load, copy the clean sprite into a `p5.Graphics` the size of the sprite. Draw the boss from it.
2. Each time hp changes, compute how many regions should show: `shown = min(n, ceil(n × (1 − hp / maxHp) / (1 − DAMAGE_END)))`, with `DAMAGE_END` ≈ 0.2 in `config.ts` (the hp fraction where the boss is fully wrecked).
3. For each newly shown region, replace that rect: `g.noStroke(); g.erase(); g.rect(x, y, w, h); g.noErase(); g.image(damaged, x, y, w, h, x, y, w, h)`. Without `noStroke()` the erase bleeds 1 px past the rect. Erasing first matters, because holes are transparent and drawing alone would not clear the clean pixels.

Regions are revealed in file order, and the last one leaves the graphics identical to the damaged sprite (verified for all five bosses). The work happens only when a region appears, never per frame. The hit flash and shadow use the clean `-flash` and `-shadow` variants; tiny mismatches at the holes don't show at ~3 frames.

### Performance budget

| Item | Rule |
| ---- | ---- |
| Background | 2 `image()` calls per frame. |
| Sprites | One `image()` each; all images total under 250 KB. |
| Bullets | `p.circle()`, the cheapest primitive. |
| Glitch | `p.copy()` on a few horizontal slices; none at suspicion 0. The most expensive effect: cap the slice count in `config.ts`. |
| Scanlines | One prerendered `p5.Graphics` overlay. |
| Red vignette | One prerendered `p5.Graphics` (red edges, transparent center), drawn with an alpha driven by suspicion. Never rebuilt per frame. |
| Never per frame | `tint()`, `loadPixels()`/`get()` on images, creating `p5.Graphics`. (Boss damage graphics are created once, at load.) |

## Tooling

| Command | Does |
| ------- | ---- |
| `pnpm dev` | Dev server with hot reload. |
| `pnpm typecheck` | `tsc --noEmit`; run after every change. |
| `pnpm build` | Typecheck and build to `dist/`. |
| `pnpm preview` | Serve the build. |

### Git

- **[Conventional Commits](https://www.conventionalcommits.org/):** `<type>(<scope>): <summary>`, imperative, lowercase, no trailing period.
  - Types: `feat fix refactor perf style docs test build chore`.
  - Scope is optional: the `src/` folders (`core`, `entities`, `systems`, `levels`, `ui`, `scenes`) plus `config`, `state`, `deps`, `release`.
  - Header of 72 characters or fewer, and a blank line before the body.
  - Breaking changes: `!` after the type/scope and a `BREAKING CHANGE:` footer.
- **One logical change per commit;** the game must typecheck and run at every commit.
- **Hooks** (`.githooks/`, activated by `pnpm install` through the `prepare` script, which sets `core.hooksPath`): `commit-msg` validates the message, `pre-commit` runs `pnpm typecheck`. Never bypass them with `--no-verify`.
- **Versioning:** [SemVer](https://semver.org/) in `package.json`. While in `0.x`, each completed implementation step bumps the minor version (`0.1.0` → `0.2.0`) and fixes bump the patch. Releases get their own commit (`chore(release): vX.Y.Z`) and an annotated tag `vX.Y.Z`. `1.0.0` = the full game playable through both endings.
- Only the project owner pushes.
