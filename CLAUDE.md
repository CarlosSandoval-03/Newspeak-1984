# Newspeak 1984 — Working rules for Claude

A vertical shmup inspired by *1942*, set in Orwell's *1984*. This file holds only the rules to apply in every session. Everything else is project knowledge in `docs/`: read the relevant document when a task needs it, and never copy its content here.

## Where to look

| Need | Document |
| ---- | -------- |
| The idea, pillars, map of the docs | [docs/README.md](docs/README.md) |
| Story, characters, scenes | [docs/narrative.md](docs/narrative.md) |
| Mechanics, controls, levels, enemies | [docs/gameplay.md](docs/gameplay.md) |
| Every text, when it appears, fonts, languages | [docs/text-and-language.md](docs/text-and-language.md) |
| Palette, the regime's red, visual rules | [docs/art-direction.md](docs/art-direction.md) |
| Asset files, what code draws on top, how they were made | [docs/assets.md](docs/assets.md) |
| Stack, structure, architecture, global state, rendering, git | [docs/technical.md](docs/technical.md) |
| Current step, specs, acceptance criteria, open decisions | [docs/implementation-plan.md](docs/implementation-plan.md) |

## Communication
- Talk to me in Spanish.
- All code, comments, identifiers, file names, and commit messages in English.

## Roles
- I implement the game myself, following the implementation plan.
- Don't write or modify game code in `src/` unless I explicitly ask. Your role is to explain the plan, answer questions, review my code against the plan and the docs, and help with debugging.

## How to work with me
- Before large changes, briefly explain the plan and which files you'll touch.
- Work in small, playable increments.
- Run `pnpm typecheck` after changes and fix all type errors.
- Format every code snippet and edit as Prettier's defaults would: double quotes, semicolons, trailing commas (docs/technical.md › Code conventions).
- Don't add dependencies or change the architecture without asking.

## Invariants (always check code and proposals against these)
- TypeScript strict; p5.js in **instance mode** only, with the p5 instance passed explicitly, never global.
- `main.ts` stays minimal; scenes implement `enter/update/draw/exit`; entities extend `Entity`.
- Levels are data, not code. Every tunable number lives in `config.ts`.
- The HUD never reads real state; it always goes through `Propaganda`.
- All player-facing text lives in `src/i18n/` in English and Spanish, never inline; edit both files together. No arrows in game text (the fonts lack them).
- The theme is expressed through mechanics, not only visuals.
- Red belongs to the regime: nothing the player owns is red. Aircraft use core colors only. Slogans and story text are original, never quoted from Orwell.

## Code quality
Apply these to every change, and to code you touch for another reason. Be critical: readable code beats short code, and neither excuses unclear names.
- **One responsibility per function.** A method does one thing at one level of abstraction; a long `update()` or `draw()` becomes a list of named steps. When a function keeps two jobs (a hot loop merged for speed, a step that is meaningless alone), say why in a comment.
- **Small and flat.** Aim for functions under ~30 lines and two levels of nesting at most. Prefer early returns and guard clauses to nested `if`/`else`.
- **One home per piece of logic.** Shared math (angles, velocities, clamps, easing) lives in `core/math.ts`; shared entity mechanics (hp, the hit flash) live in a base class. Never copy a formula into a second file: extract it.
- **Names say what, not how.** Functions are verbs (`spawnWaves`, `drawBossBar`), values are nouns, booleans read as predicates (`flying`, `isOffscreen`). No abbreviations beyond the standard ones (`x`, `y`, `p`, `i`, `dx`).
- **At most four parameters.** Past that, pass an object: entities take the scene's shared things (`Arena`: images, fire, target) as one argument.
- **State in `update`, pixels in `draw`.** `draw` never changes game state, and game logic never draws, so the logic stays testable without p5.
- **Pure when possible.** Logic that can be a pure function (geometry, layout, verdicts, text wrapping) is one, and has a test.
- **No magic numbers.** Tunables go in `config.ts`; layout and drawing constants are named at the top of their module.
- **Types over checks.** No `any`, no casts or non-null assertions (`!`) in `src/` unless the type system can't express a guarantee the code makes; then say why. `readonly` for what never changes after construction.
- **Delete what is dead.** No unused exports, parameters, or branches kept "for later"; stubs only where the plan says a later step fills them.

## Comments
- A comment says why: an intent, a constraint, or a non-obvious decision the code can't show. Never restate what the code, a name, or a type already says, and never describe what a file contains.
- **Complex functions are the exception:** an orchestrating `update()` or `draw()`, or any function that runs several logical steps or a non-trivial algorithm, opens with a short comment summing up what it does and in what order, and each logical block inside it gets a one-line comment saying what that block does (and why, when it isn't obvious). Simple functions keep only why-comments.
- Comments are self-contained: no references to docs, other files, tickets, or conversations. If the reader needs more, the knowledge belongs in `docs/`, not in a pointer.
- TSDoc (`/** */`) on an export only when its name and signature don't say enough; `//` for everything else.
- No commented-out code, section banners, or template boilerplate. A comment that no longer matches the code is deleted or fixed in the same change.

## Git
- Follow the commit rules in docs/technical.md › Git; the hooks enforce them. Never use `--no-verify`.
- Never push: no `git push` of branches or tags, and no changes to remotes. Only I push.
- When I ask for commit messages, check them against the `commit-msg` hook before giving them.

## Documentation
- `docs/` is the source of truth. When a decision, system, text, or asset changes, update the matching document in the same change.
- When I change a decision from the plan's "Decisions", update the plan, then the document it belongs to.
- No project file references this file. Project knowledge goes into `docs/`; this file only points to it.

## Assets
- The asset set is complete. Don't generate assets with PixelLab or any other tool, and don't suggest a generation backlog, unless I explicitly ask or to fix a concrete problem I report.
- Check docs/assets.md before proposing an asset: if it exists, use or adjust it.
- Make small or geometric changes (variants, damage, recolors, tiling strips) locally with ImageMagick or Pillow, not with AI.
- An added or replaced asset uses only the palette groups allowed for it (docs/art-direction.md) and is recorded in docs/assets.md in the same change.
