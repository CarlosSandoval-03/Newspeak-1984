# Implementation Plan

This document says **what** to build in each step, **how the pieces fit together**, and **how to tell when a step is finished**. The design rules come from [CLAUDE.md](../CLAUDE.md). Where CLAUDE.md leaves a gap, this plan fills it with a proposal, marked **Decision**. Every decision is collected in [Decisions to confirm](#decisions-to-confirm) so you can override any of them before you build on it.

Every step ends with a playable game. Each one finishes with a version bump (see CLAUDE.md > Git & versioning).

| Step | Delivers | Version |
| ---- | -------- | ------- |
| 0 | Scaffold: Vite, TypeScript, p5, tooling | `0.1.0` (done) |
| 1 | Core shmup: scenes, input, player, enemies, collisions, scrolling, HUD | `0.2.0` |
| 2 | Surveillance Eyes and Suspicion | `0.3.0` |
| 3 | Newspeak: words, pickups, diaries, Dictionary scene | `0.4.0` |
| 4 | Level flow, bosses, Ministry of Truth, high scores, endings | `0.5.0` |
| 5 | Propaganda (lying HUD), ticker, glitch, scanlines, posters | `0.6.0` |
| — | Content and balance for all 5 levels, polish | `1.0.0` |

---

## Global conventions

These apply to every step.

### Time is measured in frames

All the rates in CLAUDE.md are per frame (for example, suspicion `+0.3–1.2/frame`). Call `p.frameRate(60)` in setup and advance the game exactly one tick per `draw()`. Do not use `deltaTime`. When you need a duration in seconds, convert it in `config.ts` (`0.5 s` → `30` frames).

**Decision:** frame-based simulation. The game slows down instead of skipping frames on slow machines, which is the authentic arcade behavior.

### Canvas and coordinates

- **Decision:** the canvas is fixed at **480 × 640** (3:4 portrait, close to the 1942 cabinet). It is centered in the page and has no scaling.
- Screen space: `(0, 0)` is the top-left corner, and `y` grows downward.
- Level space: positions in level data are measured in **scroll distance**, the pixels scrolled since the level started. An element defined at `at: 1200` appears at the top edge of the screen once the background has scrolled 1200 px.

### Where things live

| Kind of value | Where |
| ------------- | ----- |
| Any tunable number (speeds, rates, thresholds, colors, sizes, weights) | `config.ts` |
| Persistent game state (lives, score, suspicion, words, stats, level) | `state.ts` |
| Shared types and interfaces | `types.ts` |
| Level content (waves, eyes, diary, boss, pickups) | `levels/levels.ts` as plain data |
| Per-frame entity lists (bullets, enemies, and so on) | `GameScene` fields |

### The p5 instance

`main.ts` creates `new p5(sketch)`. The sketch's `setup` and `draw` only create and call the `SceneManager`. Pass the p5 instance (`p: p5`) into constructors or methods; never store it in a global.

### Vectors

**Decision:** use a plain `Vec = { x: number; y: number }` type from `types.ts` instead of `p5.Vector`. This keeps `core/` free of p5 (CLAUDE.md asks for `core/` to be theme-agnostic) and makes the collision math trivial.

### Controls

**Decision:**

| Action | Keys |
| ------ | ---- |
| Move | Arrow keys or WASD |
| Shoot (hold) | `Space` or `Z` |
| Dash (ESCAPE) | `X` or `Shift` |
| Bomb (REMEMBER) | `C` |
| Truth (TRUTH) | `V` |
| Confirm / skip text | `Enter` |
| Pause | `P` or `Escape` |

Read keys by `KeyboardEvent.code` so the controls work on any keyboard layout.

---

## Step 1: Core shmup (`0.2.0`)

**Goal:** a plain vertical shooter that already uses the final architecture. There is no theme yet beyond the palette.

### Files

Create every file from the structure in CLAUDE.md. Files that are not part of this step are **typed stubs**: they export the class, function, or type with the right name, and the body is empty or returns a neutral value. Later steps fill them in without changing any imports.

| File | In this step |
| ---- | ------------ |
| `main.ts` | Creates the p5 instance. `setup`: canvas, `frameRate(60)`, `SceneManager` starting on `MenuScene`. `draw`: `manager.update(); manager.draw();` |
| `config.ts` | Canvas size, palette, player, bullet, and enemy numbers, scroll speed |
| `types.ts` | `Vec`, `Word`, `AlertLevel`, `GameState`, `LevelDef`, `WaveDef` (shapes below) |
| `state.ts` | `state` object with the shape from CLAUDE.md, `resetGame()`, `resetLevelState()` |
| `core/Scene.ts` | `Scene` interface |
| `core/SceneManager.ts` | Holds the current scene and switches between scenes |
| `core/Input.ts` | Keyboard state |
| `core/Collisions.ts` | Circle–circle test |
| `entities/Entity.ts` | Abstract base class |
| `entities/Player.ts`, `Bullet.ts`, `Enemy.ts` | Real implementations |
| `entities/Eye.ts`, `Boss.ts`, `Pickup.ts` | Stubs |
| `systems/Spawner.ts` | Reads waves from level data |
| `systems/Propaganda.ts` | **Pass-through version**: returns the real values and never lies |
| `systems/Suspicion.ts`, `Newspeak.ts`, `Ministry.ts` | Stubs |
| `levels/levels.ts` | Level 1 waves only |
| `levels/Background.ts` | Scrolling background on a `p5.Graphics` |
| `ui/HUD.ts` | Lives and score, read **through `Propaganda`** |
| `ui/Ticker.ts`, `ui/effects.ts` | Stubs |
| `scenes/MenuScene.ts` | Title and "press Enter" |
| `scenes/GameScene.ts` | The game loop |
| `scenes/DictionaryScene.ts`, `MinistryScene.ts`, `EndingScene.ts` | Stubs |

### Specification

**Scene and SceneManager**

- `Scene` has four methods: `enter(): void`, `update(): void`, `draw(): void`, and `exit(): void`.
- `SceneManager.change(next: Scene)` calls `exit()` on the current scene, swaps it out, and calls `enter()` on the new one. Scenes receive `p` and the manager in their constructor so they can switch scenes themselves.
- `SceneManager.update()` and `SceneManager.draw()` forward to the current scene, then call `input.endFrame()`.

**Input**

- Listens to `keydown` and `keyup` on `window` and keeps a `Set<string>` of the codes that are held down. Call `preventDefault()` for the game keys so the arrow keys and Space don't scroll the page.
- `isDown(code)` reports whether a key is held. `wasPressed(code)` is true only on the frame the key went down. `endFrame()` clears the "pressed this frame" set.
- Add helpers for actions, such as `isDown('shoot')`, that map to the key table above. The key mapping lives in `config.ts`.

**Entity**

- Abstract class with `pos: Vec`, `vel: Vec`, `radius: number`, `alive: boolean`, `update(): void`, and `draw(p: p5): void`.
- The default `update()` adds `vel` to `pos`. Add `isOffscreen(margin)` so dead entities can be culled.

**Player**

- Moves at a constant speed with 8 directions; diagonal movement is normalized. The player is clamped inside the canvas.
- Holding Shoot fires straight up every `PLAYER_FIRE_COOLDOWN` frames.
- When hit, the player loses one real life and respawns at the bottom center with `RESPAWN_INVULN_FRAMES` frames of invulnerability. While invulnerable, the ship blinks by skipping its draw every few frames.
- When the last life is lost, the game is over. **Decision:** show "VAPORIZED" for about 2 seconds, then return to the Menu.

**Bullet**

- Has an owner, `'player'` or `'enemy'`, a speed, and a radius. It dies when it leaves the screen.

**Enemy**

- Spawned by the Spawner from a wave. Each enemy has `hp`, a `score` value, and a `kind`.
- Step 1 kinds: `straight` flies straight down, and `sine` flies down while weaving horizontally. Both shoot at the player's current position every `ENEMY_FIRE_INTERVAL` frames, with some random jitter.
- It dies at 0 hp, which adds `score` to `state.realScore` and increments `stats.kills`. It is removed when it leaves the screen.

**Collisions**

- `circlesOverlap(a, b)` returns `dx*dx + dy*dy < (ra + rb)^2`. Compare squared distances so no square root is needed.
- `GameScene` checks three pairs: player bullets against enemies, enemy bullets against the player, and enemies against the player.

**Spawner**

- Holds the `LevelDef` and the current scroll distance. When `scroll >= wave.at`, it spawns that wave once.
- A wave is data, for example `{ at: 600, kind: 'sine', count: 5, x: 240, spacing: 40 }`.

**Background**

- Prerender one tile taller than the canvas into a `p5.Graphics` with `createGraphics` (ground, roads, blocky buildings in the greys). Draw it twice, offset by `scroll % tileHeight`, so the scroll loops seamlessly.
- The scroll speed is `SCROLL_SPEED` px per frame. The Spawner and, later, the eyes use the same scroll value.

**HUD**

- Shows score (top left) and lives (top right). It calls `propaganda.displayedScore()` and `propaganda.displayedLives()` and never reads `state` directly. In this step those methods return the real values.

**GameScene**

- `enter()` resets the level state and builds the background and spawner.
- `update()` order: input → player → spawner → entities → collisions → cull dead entities → scroll.
- `draw()` order: background → enemies → bullets → player → HUD.
- For now, once the last wave is cleared the level simply loops: the scroll resets and the waves spawn again. Proper level ends come in step 4.

### Shapes (`types.ts`)

```ts
type Vec = { x: number; y: number };
type Word = 'FREE' | 'ESCAPE' | 'TRUTH' | 'REMEMBER';
type AlertLevel = 0 | 1 | 2;

interface WaveDef {
  at: number;          // scroll distance
  kind: EnemyKind;
  count: number;
  x: number;           // spawn x of the first enemy
  spacing: number;     // horizontal gap between enemies
}

interface LevelDef {
  waves: WaveDef[];
  // added in later steps: eyes, pickups, diary, boss, length
}
```

### Done when

- [ ] `pnpm typecheck` and `pnpm build` pass.
- [ ] Menu → Enter → the game starts.
- [ ] The player moves in 8 directions, stays on screen, and shoots by holding the button.
- [ ] Level 1 waves appear at their scroll positions and shoot back.
- [ ] Hits destroy enemies and add score. Getting hit costs a life, then the player respawns with blinking invulnerability.
- [ ] Losing all lives shows "VAPORIZED" and returns to the Menu.
- [ ] The background scrolls with no visible seam.
- [ ] The HUD gets every value through `Propaganda`; a search for `state.` in `ui/HUD.ts` finds nothing.
- [ ] Every file from the structure exists, and the stubs typecheck.

---

## Step 2: Surveillance Eyes and Suspicion (`0.3.0`)

**Goal:** the regime watches you. Being seen has consequences that escalate.

### Files

`entities/Eye.ts`, `systems/Suspicion.ts`, `entities/Boss.ts` (used for the Thought Police), and updates to `levels/levels.ts`, `systems/Spawner.ts`, `entities/Enemy.ts`, `config.ts`, `ui/HUD.ts`, and `scenes/GameScene.ts`.

### Specification

**Eye**

- There are two types:
  - `tower`: fixed to the ground, so it scrolls down with the background.
  - `drone`: flies a patrol path, either back and forth between two x positions or along a sine path, while descending slowly.
- Vision cone: `facing` (the base angle), `aperture` (default 45°), `range`, and a sinusoidal sweep `angle = facing + sweepAmp * sin(frame * sweepSpeed + phase)`.
- Detection: `dist(eye, player) < range` **and** `abs(atan2(sin(d), cos(d))) < aperture / 2`, where `d = angleToPlayer - angle`. Line of sight is ignored; buildings don't block vision.
- Drawing: a `p.arc(x, y, 2*range, 2*range, angle - aperture/2, angle + aperture/2, PIE)` with low-alpha fill. It is grey (`#7a7a7a`) when idle and red (`#b3261e`) when detecting.
- Eyes have hp and can be shot down. Destroying one adds **+15 suspicion** immediately and increments `stats.eyesDestroyed`. Eyes don't shoot.
- Eyes are placed by level data: `eyes: [{ at, type, x, facing, range, sweepAmp, sweepSpeed, path? }]`.

**Suspicion** (owns `state.suspicion` and `state.alertLevel`)

- `update(seenBy: Eye[])`:
  - If at least one eye sees the player, suspicion rises by `lerp(1.2, 0.3, distance / range)` per frame, using the closest detecting eye. Closer eyes raise it faster. Increment `stats.framesSeen`.
  - If no eye sees the player, it decays by `0.05` per frame.
  - Clamp the value to `[0, 100]`.
- `add(amount)` is used for instant changes: destroying an eye, and in later steps crossed-out pickups and diaries.
- The alert level comes from thresholds in `config.ts`:

  | Suspicion | Level | Effect |
  | --------- | ----- | ------ |
  | 0–33 | 0, normal | none |
  | 34–66 | 1, alert | +30% spawn rate and more enemy fire |
  | 67–99 | 2, pursuit | the effects above, and new enemies home in on the player |
  | 100 | Thought Police | see below |

- **Alert:** the Spawner adds extra enemies to each wave (`count * 1.3`, rounded up), and `ENEMY_FIRE_INTERVAL` is divided by `ALERT_FIRE_MULT`.
- **Pursuit:** newly spawned enemies get the `homing` behavior. They turn toward the player at a capped turn rate (`HOMING_TURN_RATE`), so they can be dodged.
- **Thought Police:** when suspicion reaches 100, spawn the Thought Police, a mini-boss built on `Boss` (hp bar, attack pattern, red accents) with a small escort. **Decision:** suspicion is frozen while it is alive. When it dies, or after `THOUGHT_POLICE_TIMEOUT` frames if it can't be killed in time, suspicion resets to **50**.

**HUD**

- Add a suspicion meter. For now it reads `Suspicion` directly; in step 5 it moves behind `Propaganda`.

### Done when

- [ ] Towers scroll with the ground, drones patrol, and both sweep their cones.
- [ ] Cones turn red exactly when the player is inside them, including near the angle wrap-around at ±180°.
- [ ] Suspicion rises faster when the player is closer, decays when unseen, and `framesSeen` counts up.
- [ ] Shooting an eye adds +15 instantly.
- [ ] At 34 the spawns and enemy fire visibly increase. At 67 the enemies start homing.
- [ ] At 100 the Thought Police appear. Afterward, suspicion is 50.
- [ ] All the numbers above live in `config.ts`.

---

## Step 3: Newspeak (`0.4.0`)

**Goal:** your abilities are words, and the Party takes them away one level at a time.

### Files

`systems/Newspeak.ts`, `entities/Pickup.ts`, `scenes/DictionaryScene.ts`, and updates to `levels/levels.ts`, `entities/Player.ts`, `entities/Enemy.ts` (camouflage), `state.ts`, and `config.ts`.

### Specification

**Words and abilities**

`state.words` is the set of words that are currently **available**. Every word has an upgrade level from 1 to `WORD_MAX_LEVEL` (default 3).

| Word | Without it | With it | Upgrade per extra pickup |
| ---- | ---------- | ------- | ------------------------ |
| `FREE` | single shot | triple spread shot | wider spread, then 5-way |
| `ESCAPE` | no dash | a short dash in the movement direction with 30 frames (0.5 s) of invulnerability, on a cooldown | shorter cooldown |
| `TRUTH` | lies are visible as truth (from step 5) and camouflaged enemies are almost invisible | press `V` to see the truth for `TRUTH_DURATION` frames, on a cooldown | longer duration |
| `REMEMBER` | no bomb | one screen-clearing bomb per level: kills normal enemies and enemy bullets, and damages bosses | +1 bomb this level |

**Decision:** TRUTH is an **active, timed ability**. If it were always on while the word is held, the HUD lies would never matter until level 5. As an active ability, it is a resource the player chooses when to spend.

**Camouflaged enemies** (new `camo` flag on `Enemy`): drawn at very low alpha. They become fully visible while TRUTH is active. They appear from level 2 on.

**Removal** (`Newspeak.applyLevel(level)`)

- Level 1 removes nothing. From level 2 on, one word is removed per level in the order from `config.ts`, `WORD_REMOVAL_ORDER = ['FREE', 'ESCAPE', 'REMEMBER', 'TRUTH']`:

  | Level | Removed this level | Still available |
  | ----- | ------------------ | --------------- |
  | 1 | — | FREE, ESCAPE, REMEMBER, TRUTH |
  | 2 | FREE | ESCAPE, REMEMBER, TRUTH |
  | 3 | ESCAPE | REMEMBER, TRUTH |
  | 4 | REMEMBER | TRUTH |
  | 5 | TRUTH | — |

- Removal is permanent for the rest of the run. **Decision:** the game has **5 levels**, one for each step of the removal order.
- **Decision:** the player starts the run with every word at level 1, so the player knows exactly what is being taken away.

**Pickups**

- They are placed by level data (`pickups: [{ at, x, word }]`) and some come from dropping enemies (`drops: Word` in a wave). They drift down slowly.
- If the word is available, the pickup upgrades that word.
- If the word has been removed, the pickup is drawn **crossed out** in red, gives nothing, and adds **+10 suspicion**. It is a temptation the player has to learn to avoid.

**Diary**

- There is one per level, at a hidden spot given in level data (`diary: { at, x }`). **Decision:** it is drawn small and dim, close to the ground layer, so it is easy to miss.
- Collecting it restores one removed word **for the rest of this level only**, adds **+25 suspicion**, and increments `stats.diaries`. **Decision:** it restores the **most recently removed** word. In level 1 nothing has been removed yet, so it gives a score bonus instead.

**DictionaryScene** (shown before every level)

- A typewriter heading such as "DICTIONARY OF NEWSPEAK — 11th EDITION" (one edition per level), followed by the four words.
- The word removed this level gets a red strike-through drawn in an animation. Words removed earlier are already struck through and greyed out.
- `Enter` skips the typewriter, then continues to the GameScene.

**state.ts**

- `resetLevelState()` clears the per-level stats (`kills`, `eyesDestroyed`, `framesSeen`, `diaries`), the bomb count, and any word a diary restored. It does not touch `realScore`, `realLives`, the permanently removed words, or the cumulative run totals that step 4 needs. **Decision:** keep a separate `runStats` object for the run totals.

### Done when

- [ ] Each word changes the player as described, and pickups upgrade it.
- [ ] Level 2 starts without FREE (single shot), and so on through level 5.
- [ ] Removed-word pickups appear crossed out and add +10 suspicion.
- [ ] The diary restores the right word for the current level only and adds +25.
- [ ] The Dictionary scene appears before each level and strikes the right word.
- [ ] TRUTH reveals camouflaged enemies while active.

---

## Step 4: Level flow, Ministry of Truth, and endings (`0.5.0`)

**Goal:** the full loop Menu → Dictionary → Game → Ministry → … → Ending, in which the regime rewrites your score.

### Files

`entities/Boss.ts` (level bosses), `systems/Ministry.ts`, `scenes/MinistryScene.ts`, `scenes/EndingScene.ts`, and updates to `levels/levels.ts`, `scenes/GameScene.ts`, `state.ts`, and `config.ts`.

### Specification

**Level end**

- Each `LevelDef` gets `length` (a scroll distance) and `boss`. Once the scroll reaches `length`, scrolling stops and the boss enters. Defeating the boss ends the level and switches to `MinistryScene`. This replaces the step 1 loop.
- **Bosses are data:** hp, size, and a list of attack phases (for example: aimed bursts → spread fan → enrage below 30% hp). One `Boss` class runs any of them.

**Obedience factor and official score** (`Ministry.ts`)

```
obedience = OBEDIENCE_BASE
          + kills         * W_KILL
          - eyesDestroyed * W_EYE
          - framesSeen    * W_SEEN
          - diaries       * W_DIARY
obedience = clamp(obedience, 0.1, 2.0)
officialLevelScore = round(realLevelScore * obedience)
```

- The weights live in `config.ts`. Tune them so that a "good citizen" run lands around 1.3–1.6 and a rebellious run around 0.3–0.6.
- `state.realScore` keeps counting silently for the whole run. Keep the official total in a separate field; it is the only score the regime ever shows, until the rebel ending.

**MinistryScene**

1. A typewriter header: "MINISTRY OF TRUTH — RECORDS DEPARTMENT".
2. The real level score is shown, then crossed out with a red line.
3. The official score is typed in beneath it.
4. A list of "corrections" is typed line by line. It is generated from the level stats, one line per stat that is not zero. Examples:
   - `Enemy aircraft destroyed: 42 → 50. Rounded in the Party's favor.`
   - `Surveillance towers lost: 3 → 0. No towers were lost.`
   - `Time under observation: 1,240 frames → 0. The pilot was never observed.`
   - `Diaries recovered: 1 → 0. No such document exists.`
5. `Enter` saves the score and goes to the next DictionaryScene, or to the Ending after level 5.

All correction texts live in `config.ts` or a data table, never inline in the scene.

**High score table** (`localStorage`, with every access wrapped in `try/catch`)

- Key: `newspeak1984.scores`. Value: a JSON array of `{ name, score, level }`, top 10, storing **official** scores only.
- **Decision:** the name is an automatic pilot ID, such as `PILOT 6079`, so the game has no name-entry screen.
- Every time a new score is saved, the past entries are tampered with:
  - Each one has a `SCORE_ALTER_CHANCE` chance of its score being multiplied by a random factor.
  - Each one has a `SCORE_ERASE_CHANCE` chance of being replaced with `[UNPERSON]` and a score of 0.
- If storage is unavailable, the table works in memory for the session and the game keeps running.
- The table is shown on the Menu and at the end of the MinistryScene.

**Endings** (`EndingScene` with a `variant`)

- **Decision:** the ending is chosen by how many diaries the player read during the run. With `runStats.diaries >= REBEL_DIARY_THRESHOLD` (default 3) the player gets the rebel ending; otherwise the obedient one.
- **Obedient:** the official score, a closing Party message, and the final high score table, already "corrected".
- **Rebel:** the first time the game shows the truth. It shows the real score next to the official one, and the run totals (kills, towers destroyed, time observed, diaries read) next to what the Ministry recorded. No regime red is used on this screen.

### Done when

- [ ] Each level ends with its boss, and the full Menu → … → Ending flow works.
- [ ] Official score = real score × obedience, with the factor clamped to [0.1, 2.0]. Check this by hand for one level.
- [ ] The MinistryScene shows the crossed-out real score, the typed official score, and the correction lines.
- [ ] High scores persist across reloads, old entries get altered or erased, and the game still runs with storage blocked (test it in a private window or with an exception thrown in DevTools).
- [ ] Both endings can be reached.

---

## Step 5: Propaganda, ticker, and effects (`0.6.0`)

**Goal:** the HUD lies, and the screen itself shows the strain of being watched.

### Files

`systems/Propaganda.ts` (the real version), `ui/Ticker.ts`, `ui/effects.ts`, and updates to `ui/HUD.ts`, `levels/Background.ts`, and `config.ts`.

### Specification

**Propaganda API**

```ts
displayedLives(): number
displayedScore(): number
displayedSuspicion(): number
apparentColor(enemy: Enemy): string
isLying(field: 'lives' | 'score' | 'suspicion' | 'ticker' | 'enemyColor'): boolean
```

The HUD and the enemy rendering go only through this API. While TRUTH is active, every method returns the real value and `isLying()` returns `false`.

**Lies escalate by level.** Each level adds a new lie and keeps the earlier ones.

| From level | Lie |
| ---------- | --- |
| 1 | The ticker's alliance flips mid-level ("We are at war with X. We have always been at war with X."), and the earlier text is rewritten without acknowledgment. |
| 2 | The score shown is inflated by a factor in `[SCORE_INFLATION_MIN, SCORE_INFLATION_MAX]`. |
| 3 | An extra life is shown intermittently: `displayedLives = realLives + 1` for a few seconds at random intervals. |
| 4 | Some enemies are drawn in the "allied" color but still shoot. |

**Fairness rule:** every false value has a tell the player can learn to spot.

- A lying number jitters by 1 px horizontally or flickers once every few frames.
- An enemy drawn in the allied color flickers back to its real color for a single frame now and then.
- Tune the tell rates in `config.ts` so the tells are subtle but noticeable once the player knows to look.

**Ticker** (`ui/Ticker.ts`): a strip of news that scrolls along the bottom edge in the monospace font. It shows production figures, war news, and slogans. **All slogans are original**; don't quote Orwell's.

**Effects** (`ui/effects.ts`)

- **Scanlines:** a `p5.Graphics` overlay prerendered once (1 px dark lines, low alpha) and drawn last every frame.
- **Glitch:** `intensity = suspicion / 100`. Each frame, copy a number of random horizontal slices of the canvas and redraw them shifted on x with `p.copy()`. Both the slice count and the maximum offset scale with intensity. At intensity 0 the effect is off.
- **Typewriter:** reveals a string character by character at `TYPEWRITER_CPF` characters per frame, and can be skipped. DictionaryScene, MinistryScene, and EndingScene use it. (If you already wrote it in steps 3–4, move it here.)

**Aesthetics**

- Add propaganda posters and telescreens to the `Background` tile, using original slogans and only the palette from CLAUDE.md.
- Regime red (`#b3261e`) is used only for regime elements: eye cones, the Thought Police, strike-throughs, stamps, and posters.
- Every piece of regime text uses a monospace or typewriter font. **Decision:** start with the generic `monospace` font. If you add a font file to `public/assets/fonts/` later, check that its license allows redistribution (OFL or Apache).

### Done when

- [ ] Each lie appears from its level and has a visible tell.
- [ ] Pressing TRUTH shows real values and true enemy colors for its duration.
- [ ] `isLying()` matches what's on screen. Write a temporary debug overlay to check this, then remove it.
- [ ] Glitch is invisible at 0 suspicion and strong near 100. Scanlines are always present.
- [ ] Posters and telescreens appear in the background, with original slogans.

---

## Toward `1.0.0`

- Write the content for levels 1–5 in `levels.ts`: waves, eyes, pickups, diary, and boss. Make the difficulty rise, and lean the level design on the word being removed. For example, level 2 (no FREE) favors precise single targets, and level 3 (no ESCAPE) has tighter bullet patterns.
- Balance the obedience weights, suspicion rates, and alert multipliers.
- Sound is optional. Assets go in `public/assets/sounds/`, played through the Web Audio API, so no new dependency is needed.
- `1.0.0` = the full game can be played through both endings (CLAUDE.md > Git & versioning).

---

## Decisions to confirm

These are the gaps this plan filled in. Change any of them before you build the step that depends on it.

| # | Decision | Step |
| - | -------- | ---- |
| 1 | Frame-based simulation at 60 fps, no `deltaTime` | 1 |
| 2 | 480 × 640 canvas, unscaled | 1 |
| 3 | Plain `Vec` type instead of `p5.Vector` | 1 |
| 4 | The control scheme in the table above | 1 |
| 5 | Game over shows "VAPORIZED" and returns to the Menu | 1 |
| 6 | Suspicion is frozen while the Thought Police are alive | 2 |
| 7 | Eye vision ignores line of sight | 2 |
| 8 | TRUTH is an active, timed ability | 3 |
| 9 | 5 levels, one for each word in the removal order | 3 |
| 10 | The run starts with all words at level 1 | 3 |
| 11 | The diary restores the most recently removed word (a score bonus in level 1) | 3 |
| 12 | Separate `runStats` for run totals | 3 |
| 13 | Automatic pilot ID instead of a name-entry screen | 4 |
| 14 | Ending chosen by diaries read during the run (≥ 3 → rebel) | 4 |
| 15 | Generic `monospace` font until a licensed font is added | 5 |
