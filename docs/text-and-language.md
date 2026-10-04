# Text and Language

Everything the player reads: what it says, where and when it appears, which voice says it, how it looks, and in which language. The regime speaks through text, so text carries the theme as much as the art does. The story behind the words: [narrative.md](narrative.md).

All player-facing text is original and lives in `src/i18n/en.ts` and `src/i18n/es.ts`, never inline in code.

## Voices

| Voice | Font | Where | Why |
| ----- | ---- | ----- | --- |
| **The machine** | VT323 | Everything live on screen: HUD, ticker, telescreens, pickups, slogans, high scores. | A monospaced terminal font, pixel-based like the sprites: the telescreen talking. |
| **The paperwork** | Courier Prime | Documents: Dictionary, the Officer's briefings, Ministry corrections, endings. | A monospaced typewriter font: the bureaucracy rewriting the record. |
| **The human voice** | Courier Prime on a leather band | The erased pilot's diary pages. | The same typewriter, but on material, not on the regime's grey: the one voice that isn't the Party's. |

Both fonts are monospaced: all regime text uses a monospaced or typewriter face. No other typeface is used.

**Files:** `public/assets/fonts/VT323-Regular.ttf` and `CourierPrime-Regular.ttf`, from [Google Fonts](https://github.com/google/fonts) under SIL OFL 1.1. The license files (`*-OFL.txt`) must ship with them. Loading: [technical.md › Loading](technical.md#loading).

## Channels

Every place where the player reads something: when it appears, in which voice, how it changes during play, and an example (in English; every string also exists in Spanish).

| Channel | Voice | When and where | How it changes | Key in `src/i18n` | Example |
| ------- | ----- | -------------- | -------------- | ----------------- | ------- |
| Ticker | Machine | Bottom strip during play. | War news, production, warnings. When the alliance flips, every past line re-renders with the new enemy. | `ticker` | `EURASIA FLEET DESTROYED OFF THE COAST`, later `EASTASIA FLEET…` |
| Rooftop murals | Machine | Under the Leader's portrait, in the background. | Usually fixed; a mural may use a banner pair and flip with a one-frame tell. | `slogans.murals` | `HE SEES YOU CLEARLY` |
| Ground slogans | Machine | Painted on plazas, scrolling with the ground. | Fixed. | `slogans.ground` | `LOOK UP` |
| Blimp banners | Machine | Towed across the screen. | The most visible flips: each pair swaps to its opposite mid-level. | `slogans.banners` | `ALWAYS OUR ALLY` / `NEVER OUR ALLY` |
| Telescreens | Machine | Background screens. | Static, the eye, or a line. | `slogans.telescreens` | `THE LEADER IS WATCHING` |
| HUD | Machine | Score, lives, suspicion, alert state, words. | Values lie by level, each with a tell. | `hud`, `words` | `SUSPICION`, `PURSUIT` |
| Word pickups | Machine | Falling pickups. | Removed words appear struck out in red. | `words` | `FREE` struck in red |
| Menu | Machine | Start screen. | Language option switches every string. | `menu`, `meta` | `BEGIN SERVICE` |
| Dictionary | Paperwork | Before each level. | One edition per level; one more word struck. | `dictionary`, `levels` | `DICTIONARY OF NEWSPEAK` · `ELEVENTH EDITION` |
| Officer briefing | Paperwork | Next to his portrait, before each level. | Three tones per level by suspicion: calm, wary, cold. | `briefings` | `Pilot 6079. We have read your file. Fly well today.` |
| Diary line | Human | Bottom of the screen on pickup, without pausing. | One per level, in order. | `diary.pages[].line` | `These ruins were not made by the enemy.` |
| Pause | Machine | Over the pause telescreen. | — | `pause` | `THE TELESCREEN REMAINS ON` |
| Ministry | Paperwork | After each boss. | One correction per non-zero stat. | `ministry` | `Surveillance towers lost: 3, corrected to 0. No towers were lost.` |
| Stamps | Machine, red | Ministry, game over. | — | `ministry.stamps`, `gameOver.stamp` | `CORRECTED`, `VAPORIZED` |
| Honor roll | Machine | Menu and Ministry. | Past entries are altered or become unpersons. | `honorRoll` | `[UNPERSON]` |
| Game over | Machine | Over the squadron photo. | — | `gameOver` | `PILOT 6079 NEVER EXISTED.` |
| Endings | Paperwork (obedient), human (rebel) | After level 5. | Obedient: the Party's message. Rebel: the truth beside the record, plus the full diary pages. | `endings`, `diary.pages[].page` | `Pilot 6079 did not land.` |

## Writing

- **Original only**, in the regime's voice. Never quote Orwell. Orwell's world (Oceania, Eurasia, the Ministries, Newspeak) is the setting; the sentences are ours.
- **The regime shouts:** everything it displays is UPPERCASE; only long prose (briefings, corrections, diary, endings) uses sentence case.
- **Short:** at most 22 characters per line (a 176 px mural band) and two lines, in every language. Ground slogans: at most 12 characters.
- **Contradictions come in pairs** stored together (`slogans.banners`); the flip replaces one with the other. For example, `ALWAYS OUR ALLY` / `NEVER OUR ALLY`.
- **Placeholders** (`{id}`, `{word}`, `{enemy}`…) instead of hard-coded names, so the ticker can rewrite itself and the briefings name the right word in each language.

## Typography

### Sizes

- **VT323:** 20 px or exact multiples (40, 60). It sits on a pixel grid; other sizes break the letterforms. 8 px per character (measured), so 60 characters per 480 px line.
- **Courier Prime:** 16 px for body, 20 px for headings, never smaller. About 9.7 px per character at 16 px, so ~49 per line.
- **Line height:** 1.2×.

### Usage map

| Element | Font | Size | Color | Case |
| ------- | ---- | ---- | ----- | ---- |
| Menu title | VT323 | 60 | `#e8e4d8` | UPPER |
| Menu options | VT323 | 20 | `#e8e4d8`; selected `#b3261e` | UPPER |
| HUD score | VT323 | 20 | `#e8e4d8` | 6 digits, zero-padded (`004210`) |
| HUD lives, suspicion label | VT323 | 20 | `#e8e4d8` | UPPER |
| Ticker | VT323 | 20 | `#e8e4d8` on a `#6e1712` (dark red) strip | UPPER |
| Word pickups | VT323 | 20 | `#e8e4d8`; removed: `#7a7a7a` + red strike-through | UPPER |
| Mural slogan | VT323 | 20 | `#e8e4d8` on a `#1a1a1a` band | UPPER |
| Ground slogan | VT323 | 40 or 60 | `#7a7a7a` on `#3a3a3a` | UPPER |
| Towed banner | VT323 | 20 | `#1a1a1a` on `#e8e4d8` | UPPER |
| Telescreen | VT323 | 20 | `#e8e4d8` | UPPER |
| High scores | VT323 | 20 | `#e8e4d8`; erased entries `#7a7a7a` | UPPER, scores right-aligned |
| Dictionary heading, words | Courier Prime | 20 | `#e8e4d8`; removed words struck in red | UPPER |
| Ministry heading, scores | Courier Prime | 20 | `#e8e4d8`; real score struck in red | UPPER |
| Stamps (`CORRECTED`, `APPROVED`, `VAPORIZED`) | VT323 | 40 | `#b3261e` inside a rotated `#b3261e` outline | UPPER |
| Officer briefings, Ministry corrections, endings | Courier Prime | 16 | `#e8e4d8` | Sentence case |
| Diary page line (in game), diary pages (rebel ending) | Courier Prime | 16 | `#e8e4d8` on a `#33251f` (leather) band: the only human voice | Sentence case |

### Rules

- **Red is the regime's ink:** text is never red (except the selected menu option and stamps). Red appears as marks *on* text (strike-throughs, stamps, seals) and as the regime's backgrounds (the dark-red ticker strip). Light text on dark red is legible; red text on dark grey is not.
- **Strike-through:** a 2 px `#b3261e` line through the middle of the text, drawn after it, growing left to right over ~15 frames, so the player watches the word being erased.
- **Typewriter reveal:** a few characters per frame (rate in `config.ts`); `Enter` reveals the rest. A blinking block cursor (one character, `#e8e4d8`) follows the text.
- **Align with characters, not pixels:** both fonts are monospaced, so use spaces and `padStart`.
- **Only lies move:** besides the typewriter, the only text animation is the tell on a false value: a one-frame flicker or a 1 px jitter ([gameplay.md › Doublethink](gameplay.md#doublethink-the-lying-hud)).
- **The rebel ending is quiet:** same fonts, no red marks, and no UPPERCASE: even its title is in sentence case.

## Languages

The game ships in **English and Spanish**, detected from the player's browser and switchable in the Menu. Both are first-class: Spanish is an adaptation, not a literal translation (the Officer addresses the pilot formally, as *usted*; *Newspeak* is *Neolengua*; *Eastasia* is *Estasia*). The four words are translated too (`LIBRE`, `ESCAPAR`, `VERDAD`, `RECORDAR`), because their removal must be read, not decoded.

### Glyphs and length

- Both fonts cover Spanish completely, including accented capitals (`Á É Í Ó Ú Ñ Ü`) and `¿ ¡`. Regime text in Spanish keeps its accents in UPPERCASE (`EDICIÓN`, `ÚLTIMA`).
- **Neither font has arrows (`→ ←`), and Courier Prime has no `№`.** Write `corrected to` / `corregido a` instead of arrows.
- Spanish runs about 20% longer. Every length limit applies to every language; check them whenever a string changes.

### Translation files

- **Files:** `src/i18n/en.ts` defines every player-facing string and exports `type Strings = typeof en`; `src/i18n/es.ts` is typed `Strings`, so a missing or misnamed key in Spanish fails `pnpm typecheck`. Array lengths (briefings, pages) are not type-checked; keep them equal.
- **Placeholders:** `{id}`, `{word}`, `{enemy}`, `{from}`, `{to}`, `{ordinal}`, `{language}`. Both languages must use the same set per string.
- **Detection** (once, at startup): `?lang=` URL parameter → saved choice in `localStorage['newspeak1984.lang']` (`try/catch`) → first supported primary subtag in `navigator.languages` → `en`. Set `document.documentElement.lang`.
- **`t(path, params)`** looks up the current language and replaces placeholders. Store data, never rendered text (high scores keep the pilot ID and an `unperson` flag), so everything follows a language switch.
- **Ticker rewrites itself:** lines use `{enemy}`, so when the alliance flips, re-rendering the history with the new enemy *is* the rewrite.
- **Adding a language:** copy `es.ts`, translate, add the code to the supported list; the type does the rest. Check glyph coverage of both fonts first.

## Rejected fonts

| Font | Why |
| ---- | --- |
| Special Elite | Not monospaced. |
| Silkscreen | Not monospaced; too small at arcade speed. |
| Press Start 2P | Too wide for a 480 px canvas. |
| A generated pixel font | Established open-license fonts preferred. |
