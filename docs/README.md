# Newspeak 1984 — Overview

The idea of the game in one page. Every other document goes deeper into one part of it.

## The idea

A vertical shmup in the tradition of Capcom's *1942*, set in Orwell's *Nineteen Eighty-Four*. You are Pilot 6079 and you fly for the Party. The game watches you, takes your abilities away one word at a time, and lies to you about how you are doing. In the end you either love the Party or leave.

**The story in brief.** Airstrip One is at a war whose enemy changes when the Party says so. Each level ends near one of the four Ministries, and each takes away a word: `FREE`, `ESCAPE`, `REMEMBER`, `TRUTH`. Hidden in every level is a page of a diary written by a pilot from your own squadron, a man the Party vaporized and erased from the squadron photo. Reading his pages raises the regime's suspicion, but with three or more you have seen enough to escape. The last enemy is not a foreign bomber but the Party's own Eye.

**A run.** Before each level, the Officer briefs you and the Dictionary strikes out a word. In the air, you shoot the enemy while staying out of the surveillance cones; being seen calls more enemies, then hunters, then the Thought Police. After each boss, the Ministry of Truth crosses out your real score and types in an official one. After level 5, the ending depends on the diary pages you read.

## Pillars

1. **The theme is in the mechanics.** Surveillance, censorship, and doublethink are systems to fight, not decoration.
2. **Unfair in the fiction, fair in the game.** Every lie has a learnable tell; losing is always the player's fault.
3. **Readable at arcade speed.** Whatever moves is brighter than the ground; red always means the regime.
4. **Small and complete.** Five levels, each with one new loss and one new lie.

## From Orwell to mechanics

| Idea from *1984* | What it becomes in the game |
| ---------------- | --------------------------- |
| The telescreen and the Thought Police | Vision cones and suspicion; the Thought Police arrive at 100. |
| Newspeak | Abilities are words, removed one per level. |
| Doublethink | The HUD lies; each lie has a tell; TRUTH sees through it, until TRUTH is removed. |
| The Ministry of Truth rewriting the past | The real score is crossed out and an official one typed in; old high scores change. |
| Unpersons | Game over erases you from a squadron photo; high scores become `[UNPERSON]`. |
| Winston's diary | Hidden diary pages, the only human voice in the game and the way out. |

## Documents

| Document | Answers |
| -------- | ------- |
| [narrative.md](narrative.md) | What story is told: setting, characters, the diaries, the story level by level, endings, and every scene with when it appears. |
| [gameplay.md](gameplay.md) | How it plays: mechanics, feedback and damage, controls, levels, enemies. |
| [text-and-language.md](text-and-language.md) | What the player reads: every text channel and when it appears, writing rules, fonts and typography, English and Spanish. |
| [art-direction.md](art-direction.md) | How it looks and why: style, palette, the regime's red, messages seen from the sky, sound. |
| [assets.md](assets.md) | Which files exist: every sprite, illustration, and font, by scene and by level; what code must draw on top; how they were made. |
| [technical.md](technical.md) | How it's built: stack, architecture, conventions, rendering, performance, tooling. |
| [implementation-plan.md](implementation-plan.md) | What to build now: each step, when it's done, and the decisions still open. |
| [art/](art/) | Visual references: boss lineup, messages seen from the sky. |

**Reading order:** this overview → narrative → gameplay → technical → the current step of the plan. The rest as needed.

**Keeping it current:**
- A confirmed or changed decision goes into the plan, then into the document it belongs to.
- Story changes go into [narrative.md](narrative.md) and the text itself into `src/i18n/`, in both languages.
- The asset set is complete. A replaced asset goes into [assets.md](assets.md); new ones are the exception, for a concrete need.
- Finished steps stay in the plan as history until `1.0.0`; after that, these documents are the reference.
