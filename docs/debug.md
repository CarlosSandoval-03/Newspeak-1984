# Debug tools

Tools for testing the game without playing the whole run every time. With them you can open any point of the flow from the URL, and use a panel that shows the hidden state and changes it with a key. They exist only on the dev server, and only when the URL asks for them.

## Availability

- **Turn them on** with `?debug=true` under `pnpm dev`, for example http://localhost:5173/?debug=true. Without it the module isn't even loaded: no panel, no keys, no infinite lives, and none of the settings or data a debug session kept. The game runs exactly as a player's would.
- **Never in a build.** `main.ts` loads `src/debug/` behind `import.meta.env.DEV`. The build replaces that check with `false` and drops the module, so neither the GitHub Pages build nor the release zip contains any of it, whatever the URL says. To confirm after a build, search `dist/assets/*.js` for `installDebug` or `unlockWords`. Neither should appear.
- **A sandbox for storage.** A debug session keeps its own copy of everything the game stores in `localStorage`: the honor roll, the language, and the panel's settings. It lives under `newspeak1984.debug.*`, so a seeded archive, a sample run, or a lost test run never reaches the real honor roll (`newspeak1984.scores`). The session starts in the real language setting, and a language picked during it stays in the sandbox.
- **Start clean** with `&reset=`, applied before anything else:

  | `&reset=` | Erases |
  | --------- | ------ |
  | `debug` | The sandbox: its honor roll, language, and panel settings. |
  | `all` | Everything the game has stored, the sandbox and the real honor roll and language included, as a first visit would find it. |

  Use `?debug=true&reset=all` once to clear what earlier versions of these tools wrote into the real storage. They had no sandbox.
- Nothing here is player-facing text. It is English-only, outside `src/i18n/`, and uses the game's colors only to stay readable.

## Recipes

| To test | Open or press |
| ------- | ------------- |
| A level's boss | `?debug=true&start=boss:3` (the land battleship), then `3` to shoot it down. |
| The landing and the Ministry | `?debug=true&start=landing:2`. |
| Each Ministry verdict | `?debug=true&start=ministry:hero`, `ministry:review`, `ministry:suspect`. |
| The honor roll being tampered with | `?debug=true&start=ministry:review&honorroll=seed`. Each entry has only a small chance of changing, so if nothing did, the table just stands: reload to roll again. |
| The rebel's departure and ending | `?debug=true&start=departure`, or `?debug=true&start=ending:rebel` for the ending alone. |
| The obedient ending | `?debug=true&start=ending:obedient`. |
| The whole last level toward a chosen ending | `?debug=true&start=boss:5&ending=rebel` (or `obedient`), or `0` in the panel at any time before the Eye goes down. |
| A late level with every word | `?debug=true&start=level:5&words=3`. |
| The Thought Police | Any level, then `6` until suspicion reaches the top. |
| A fight you don't want to lose | `1` for infinite lives. |
| Why something hits or doesn't | `9` for the hitboxes. |
| How the Ministry will judge the level | Open the panel: it shows the obedience and verdict so far. |

## Start a flow from the URL

`&start=` opens a point of the game on a fresh run. Every URL here also carries `?debug=true`. A value the tools don't recognize opens the Menu as usual.

| `&start=` | Opens |
| --------- | ----- |
| `dictionary:N` | Level N's Dictionary. |
| `level:N` | Level N, past the takeoff, with the pilot at the stick. `level` alone is level 1. |
| `boss:N` | Level N where the city stops, as its boss comes in. |
| `landing:N` | Level N with its boss already down, so the landing starts at once. |
| `departure` | Level 5 with the Eye already down and enough diary pages read: the rebel climbs away. |
| `ministry:hero`, `ministry:review`, `ministry:suspect` | The MinistryScene for a level flown to that verdict, with sample stats and a 12000 level score. |
| `ending:obedient`, `ending:rebel` | Either ending, for a long sample run (the rebel with at least `REBEL_DIARY_THRESHOLD` pages read). |
| `gameover` | The VAPORIZED screen. |

`diaries`, `words`, and `ending` act on the run a flow starts, so they need `start`. `honorroll` works with or without it:

| Parameter | Effect |
| --------- | ------ |
| `&diaries=N` | Reads the first N diary pages (one per level, at most five) before the flow starts. A rebel needs `REBEL_DIARY_THRESHOLD`. |
| `&words=N` | Once the flow has started, unlocks all four words at level N (0 to 3), even the ones the Party has taken, with REMEMBER's bombs to match. |
| `&ending=rebel`, `&ending=obedient` | Once the flow has started, sets the diary pages read to meet that ending's condition: at least `REBEL_DIARY_THRESHOLD` for the rebel, one short of it for the obedient pilot. |
| `&honorroll=seed` | Adds six sample runs to the honor roll, two of them unpersons. |
| `&honorroll=clear` | Empties the honor roll. |

## The debug panel

`` ` `` (Backquote) shows or hides the panel, over the top of the screen, in any scene. It shows:

- the level, the lives (`INF` with infinite lives), and suspicion with its alert state;
- the diary pages read in the run, which ones, and the ending they lead to right now;
- the level's stats: kills, eyes destroyed, Thought Police downed, seconds observed, diary pages;
- the obedience and the verdict the Ministry would give the level so far, and the last verdict given;
- the real, official, and standing scores, the standing score being what the HUD shows;
- each word's level, a dash once the Party has taken it, and the bombs;
- in a level, the flight phase, the scroll against the level's length, and the boss's or the Thought Police's health.

While the panel shows, the number keys run commands. They don't clash with the game's controls. `2`, `3`, `4`, `6`, and `7` act on a level and do nothing outside one; the rest work in any scene.

| Key | Command |
| --- | ------- |
| `1` | Infinite lives on or off. The lives are refilled after every frame, so the pilot still crashes, explodes, and respawns, but the run never ends. |
| `2` | Jump to where the city stops. The waves not yet flown never come, and the boss arrives once the sky allows it. |
| `3` | Shoot down the boss, or the Thought Police if they are here, scored, recorded, and exploded like any kill. |
| `4` | End the level now, as if it had landed: the Ministry judges it. Even during the rebel's departure, so let that one finish on its own. |
| `5` | Read this level's diary page, without its suspicion or the word it gives back. |
| `6` | Raise suspicion by one alert level's worth. |
| `7` | Clear suspicion, releasing it from the top if the Thought Police had frozen it there. |
| `8` | Unlock all four words one level up from the lowest of them, back to asleep after the top, with the bombs to match. |
| `9` | Hitboxes on or off: the collision circles, the pilot in paper and everything else in steel. |
| `0` | Switch the run to the other ending, by setting the diary pages read to just meet its condition. The ending is decided when the Eye goes down, so switch before that. |

The panel, the infinite lives, and the hitboxes are kept in the sandbox (`newspeak1984.debug.tools`), so they stay on across reloads with `debug=true`, and `&reset=debug` turns them all off.

## What the tools change

The tools act on the real run, so what they do counts like play:

- **Every `start` resets the run.** That means a new pilot ID, all words dormant, and nothing read.
- **The sandbox's honor roll keeps what you did.** `ending:*` enters the sample run, and `gameover` or a lost test run enters an `[UNPERSON]`, as in a real run, but only in the sandbox. Use `&honorroll=clear` or `&reset=debug` to start it over.
- **A shot-down boss or Thought Police counts.** `3` scores the kill: a boss is a kill, and a Thought Police officer weighs on obedience.
- **The Ministry judges what is there.** `4` judges whatever the level's stats are at that moment.
- **Diary pages read with `5` count toward the rebel ending.** So do the ones from `&diaries=`.
- **Choosing an ending rewrites the pages read.** `0` and `&ending=` leave the run with the first pages read, as many as the condition needs (or the ones already read, if the rebel had more), so the rebel ending shows those pages.
- **Unlocked words last the level.** The next level's Dictionary takes its word again; press `8` or use `&words=` once more.
- **Sample data for `ministry:*` and `ending:*`.** The stats and scores are made up, chosen so every line on those screens has something to show.

## How it works

| File | Holds |
| ---- | ----- |
| `src/debug/flows.ts` | `parseFlow()` (pure: the URL value to a `Flow`, or `null`), `startFlow()`, which builds each flow's scene and state, `unlockWords()`, and `chooseEnding()`. |
| `src/debug/debug.ts` | `installDebug()`: resets storage if asked and moves the game into the sandbox, then reads the URL, listens for the keys, and wraps `SceneManager.frame` to refill the lives and draw the hitboxes and the panel after every frame. Also the commands and the panel's lines. |
| `src/debug/sandbox.ts` | `sandboxKey()` (pure), `sandboxStorage()`, which puts a stand-in for `localStorage` that reads and writes the sandbox's keys in the game's place, and `resetStorage()`. |
| `src/debug/flows.test.ts`, `sandbox.test.ts` | The parsing, every flow, `unlockWords()`, `chooseEnding()`, the sandbox's isolation, and both resets. |

- **No hooks in the game.** The tools reach the scenes through their private fields (`scene["flight"]`), as the tests and the bench do, so no game file knows they exist. The only exceptions are the `debug=true` check in `main.ts` and `clearHonorRoll()` in the honor roll's storage. The ending's condition lives once, in `earnedEnding()` (`EndingScene.ts`), which both the game and the tools ask.
- **To add a flow:** add its case to `Flow`, `parseFlow()`, and `startFlow()`, test it in `flows.test.ts`, and add it to the tables above.
- **To add a command:** add it to `COMMANDS` in `debug.ts` with a free key and a short label (the panel lists them three to a row), and to the keys table above.

Keep any new tool on the dev server: anything a tool needs from the game is read through private fields, never added as a hook.
