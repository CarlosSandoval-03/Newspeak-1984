# Narrative

The story *Newspeak 1984* tells, who is in it, and the scenes that tell it. The rules that drive it are in [gameplay.md](gameplay.md); every line of text, in [text-and-language.md](text-and-language.md).

## Setting

Airstrip One, 1984: a grey city under the four Ministries and the Party, permanently at war. Who the enemy is depends on the day: the ticker says Eurasia, then Eastasia, and insists it was always so. The player never sees a civilian; only rooftops, ruins, surveillance, and the regime's messages written for the sky.

## Characters

| Character | Who | How they appear |
| --------- | --- | --------------- |
| **The pilot** | The player: a skilled Party pilot who starts loyal, known only by a four-digit number drawn for each run (`PILOT 6079`). Never speaks. | `player.png` in flight; `pilot-portrait.png` in the Ministry and endings; the ID in briefings, game over, endings, and the honor roll. |
| **The Leader** | The face of the Party. Never speaks directly; only watches. | Rooftop murals, telescreens, the obedient ending. |
| **The Officer** | An Inner Party officer who briefs the pilot before each level and comments on the record after it. The regime's human voice. | `officer-portrait.png` on the Dictionary and Ministry screens. Colder as the Ministry's verdict on the pilot worsens. |
| **The erased pilot** | A former member of the squadron, vaporized before the game begins. He wrote the diaries. | The blank silhouette in `vaporized.png`; his handwriting in the diary pages. |
| **The clerk** | A records clerk at the Ministry of Truth, rewriting the past at his typewriter. | `memory-hole.png`. |

## The hidden story: the diaries

Each level hides one diary page, written by the erased pilot. Read in order, the five pages tell what the Party removed: he remembered the words, kept a diary, was seen, and was vaporized. The pages are optional and risky (+25 suspicion each), so the hidden story is only told to the players who dare to look. With three or more pages, the pilot has seen enough to leave: the rebel ending.

The squadron photo closes the loop: on game over, the photo shows one pilot erased. A player who read the diaries knows whose place they just took.

## Story by level

| Level | Official story (ticker, briefing) | What is really happening | Diary page |
| ----- | --------------------------------- | ------------------------ | ---------- |
| 1 · Ministry of Truth | Defend the capital from Eurasian raids. | Mid-level the enemy becomes Eastasia, and the record is rewritten to say it always was. | He notices the change in the newspapers. |
| 2 · Ministry of Plenty, across the river | Production is up; rations are raised. | FREE is gone. The score shown is inflated, like the production figures. | He remembers a word the Dictionary no longer has. |
| 3 · Ministry of Peace | The war is going well; reinforcements arrive. | ESCAPE is gone. The extra life on the HUD sometimes isn't there. | He learns the land battleship shells the city's own districts. |
| 4 · The ruined prole district | Enemy rockets destroyed this district. | REMEMBER is gone over the ruins the Party wants forgotten. Some "allies" shoot. | He writes that the ruins were made by the Party. |
| 5 · Ministry of Love | Protect the heart of the Party. | TRUTH is gone; every lie at once. The last boss is the Party's own Eye. | His last page: they are coming for him. |

## Endings

The ending depends on how many diary pages were read across the run (≥ 3 → rebel).

- **Obedient:** the official score, a closing Party message, and the "corrected" high score table. The pilot sits alone under the Leader's telescreen: defeat disguised as peace.
- **Rebel:** the first time the game tells the truth. The real score next to the official one, what really happened next to what the Ministry recorded, and the diary pages read. The pilot flies out over open country toward a pale sky: the only bright scene, with no red.

The words themselves (briefings, ticker, diary pages, endings) are in `src/i18n/`; where and how each one appears is in [text-and-language.md › Channels](text-and-language.md#channels).

## Scenes

| Scene | When it appears | What the player sees | Assets | Narrative purpose |
| ----- | --------------- | -------------------- | ------ | ----------------- |
| Menu | At start, and after game over or an ending. | The Ministry's pyramid over the city at night; title, options, high scores. | `menu-city.png` | The regime dominates the skyline before play begins. |
| Dictionary + briefing | Before every level. | The official dictionary, the edition for this level; this level's word struck out in red. The Officer gives one or two lines of orders. | `dictionary-cover.png`, `officer-portrait.png` | Censorship as a ritual, announced in advance, by a human voice. |
| Game | During each level. | The city from above, enemies, the HUD, the ticker, the regime's messages. | Sprites, tilesets, landmarks | The war, and the surveillance inside it. |
| Diary page | When a diary is picked up, without pausing. | One line of the erased pilot's page typed at the bottom of the screen. | `diary.png` | The hidden story, told in fragments. |
| Pause | When the player pauses. | A telescreen eye with a red iris; "PAUSED". | `pause-telescreen.png` | Even stopping the game is observed. |
| Ministry | After each boss. | The real score crossed out and sent down the memory hole, the official score typed in, the corrections, the high scores. | `memory-hole.png`, `pilot-portrait.png`, `officer-portrait.png` | The past is rewritten in front of the player. |
| VAPORIZED | When the last life is lost. | A squadron photo with one pilot erased, stamped `VAPORIZED`. | `vaporized.png` | Death is not enough: the player becomes an unperson, like the diarist. |
| Obedient ending | After level 5 with fewer than 3 pages read. | A lone man in a café under the Leader's telescreen; the official score. | `ending-obedient.png` | Defeat disguised as peace. |
| Rebel ending | After level 5 with 3 or more pages read. | A plane over open country toward a pale sky; real score, real record, diary pages. | `ending-rebel.png` | Escape, and the truth. |
