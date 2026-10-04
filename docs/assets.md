# Asset Catalog

Every visual asset: size, use, and the p5 drawing it needs. Why it looks this way: [art-direction.md](art-direction.md). Where it fits in the story: [narrative.md](narrative.md) and its [scenes](narrative.md#scenes). How code draws it: [technical.md › Rendering](technical.md#rendering).

**The asset set is complete.** Everything the game needs exists; don't regenerate an asset that is listed here. Replace one only to fix a concrete problem, and update this catalog in the same change.

All images use only the game palette ([art-direction.md](art-direction.md)): the core colors everywhere, the regime red ramp only on regime assets (every red asset is shaded with it), and material tones where a real material helps (ground, the AA gun's sandbags, the diary). Aircraft stay in core colors. References: [boss lineup](art/boss-lineup.png), [messages seen from the sky](art/poster-mockup.png).

## Index by scene

| Scene | Assets |
| ----- | ------ |
| Menu | `menu-city.png` |
| Dictionary + briefing | `dictionary-cover.png`, `officer-portrait.png` |
| Game | Player, enemies, bosses (+ damage), terrain, landmarks, `poster-leader.png`, `propaganda-blimp.png`, `diary.png`, variants |
| Pause | `pause-telescreen.png` |
| Ministry | `memory-hole.png`, `pilot-portrait.png`, `officer-portrait.png` |
| Game over | `vaporized.png` |
| Endings | `ending-obedient.png`, `ending-rebel.png`, `pilot-portrait.png` |

## Index by level

| Level | Terrain | Landmark | Boss | Specific to this level |
| ----- | ------- | -------- | ---- | ---------------------- |
| 1 | `ground-tileset`, `crater` | `ministry-truth-topdown` | `boss-fortress` | — |
| 2 | `ground-tileset`, `river-tileset`, `bridge` | `ministry-plenty-topdown` | `boss-airship` | Camouflaged fighters start appearing. |
| 3 | `rubble-tileset`, `railway` | `ministry-peace-topdown` | `boss-landship` | The boss rides the railway. |
| 4 | `rubble-tileset`, `crater` | — (the ruins are the landmark) | `boss-wing` | `enemy-fighter-allied` (the "ally" lie). |
| 5 | `ground-tileset` | `ministry-love-topdown` | `boss-eye` | Every lie at once. |

Every level also uses the regular enemies, surveillance (eye towers, drones, AA guns), the gyros and Thought Police when suspicion calls them, `poster-leader.png` murals, the propaganda blimp, and one `diary.png`.

## Sprites (`public/assets/sprites/`)

Top-down. Hitbox radii are suggestions for `config.ts`, smaller than the sprites as is usual in shmups.

### Player and enemies

| File | Size | Used by | Step | Hitbox r | Notes |
| ---- | ---- | ------- | ---- | -------- | ----- |
| `player.png` | 48×48 | Player | 1 | 5 | Off-white, nose up: the brightest object on screen. |
| `player-bank-left.png`, `player-bank-right.png` | 48×48 | Player strafing | Polish | 5 | Lowered wing foreshortened and darkened one step (made locally). Show while moving sideways. |
| `enemy-fighter.png` | 48×48 | Kinds `straight`, `sine`, `camo` | 1 | 12 | Mid grey, nose down. Behavior tells the kinds apart. |
| `enemy-bomber.png` | 64×64 | Heavy enemy | 1 | 20 | Twin-engine. |
| `enemy-gyro.png` | 48×48 | Kind `homing` (pursuit) | 2 | 10 | Autogyro: its silhouette warns that the regime is chasing you. |
| `enemy-aa-gun.png` | 48×48 | Ground turret | 2 | 14 | Burlap sandbag ring (material tones) and a grey steel platform; scrolls with the ground. |
| `eye-tower.png` | 48×48 | Eye `tower` | 2 | 16 | Red lens = the cone's origin. |
| `thought-police.png` | 96×96 | Thought Police mini-boss | 2 | 30 | Dark armor, red lights. |
| `thought-police-escort.png` | 48×48 | Its escort | 2 | 12 | The fighter recolored: black body, red stripes. |
| `diary.png` | 32×32 | Diary pickup | 3 | 10 | A page of the erased pilot's diary. Leather cover (material tones): the one human object among the propaganda. Drawn dim on purpose. |

### Bosses

One per level. Hitboxes and weak points live in the level data.

| File | Size | Level | Notes |
| ---- | ---- | ----- | ----- |
| `boss-fortress.png` | 128×128 | 1 | Four-engine flying fortress. |
| `boss-airship.png` | 96×160 | 2 | War zeppelin: slow and tall; engine pods are weak points. |
| `boss-landship.png` | 128×128 | 3 | Land battleship on tracks. **Ground** boss: scrolls with the ground, main cannon fires straight down. |
| `boss-wing.png` | 160×112 | 4 | Flying wing: wide, fast, sweeps sideways. |
| `boss-eye.png` | 160×160 | 5 | **The Eye**, the Party's own fortress; the only red boss. Weak point: the lens. |

**Damage** (`boss-*-damaged.png` + `boss-*-damage.json`, all five bosses): the enemy visibly breaking, **progressively** ([gameplay.md › Feedback and damage](gameplay.md#feedback-and-damage)). The damaged sprite is the fully wrecked state; holes are transparent, so the ground shows through. The JSON lists the regions where it differs from the clean sprite, in reveal order (holes first, cracks last; 6–12 per boss). The game reveals them one by one as hp drops ([technical.md › Progressive damage](technical.md#progressive-damage)). Both were made locally, because the generator ignores small changes.

### Background

| File | Size | Notes |
| ---- | ---- | ----- |
| `ground-tileset.png` + `.json` | 16 tiles, 32×32 | Wang tileset: asphalt (`lower`) ↔ concrete plaza (`upper`). |
| `rubble-tileset.png` + `.json` | 16 tiles, 32×32 | Asphalt (`lower`) ↔ demolished brick lots (`upper`) in brick tones with a concrete curb. Same asphalt, so both join seamlessly. |
| `river-tileset.png` + `.json` | 16 tiles, 32×32 | Asphalt (`lower`) ↔ river water (`upper`) in water tones, with a stone embankment. The Thames splits the city in level 2. Ripples are darker than the surface on purpose: light dots would read as bullets. |
| `bridge.png` | 48×96 | Vertical bridge laid over the river. Bridges are bottlenecks: the only ground the AA guns can cover. |
| `railway.png` | 48×32 | Track strip that tiles seamlessly along y (made locally): grey ballast, wooden sleepers, steel rails. Level 3: the land battleship rides it. Lay it over rubble. |
| `crater.png` | 48×48 | Bomb crater decal on asphalt. |
| `ministry-truth-topdown.png` | 128×128 | Ministry of Truth: white stepped pyramid. Level 1 landmark; the only bright building, as in Orwell ("glittering white concrete"). |
| `ministry-plenty-topdown.png` | 128×128 | Ministry of Plenty: warehouse and grain silos, the rationing machine. Level 2 landmark. |
| `ministry-peace-topdown.png` | 128×128 | Ministry of Peace: star fort with artillery, the war ministry. Level 3 landmark. |
| `ministry-love-topdown.png` | 128×128 | Ministry of Love: windowless block, barbed wire, red-lit guard towers. Level 5 landmark and the stage for the final boss. |
| `propaganda-blimp.png` | 96×48 | The regime's voice in the sky, nose right. Tows the slogan banners across the screen; it can't be shot and doesn't collide. Mirror it to fly left. |
| `poster-leader.png` | 64×64 | Leader's portrait on red, for rooftop murals. |
| `ministry-illustration.png` | 128×128 | The pyramid in 3/4 view: scenes only, never the map. |

Tileset `.json`: 16 entries `{ corners: { NW, NE, SW, SE }, x, y }`; each corner is `"lower"` or `"upper"`, and `x`, `y` locate the tile in the sheet. Usage: [technical.md › Background](technical.md#background).

### Variants (`sprites/variants/`)

Prebuilt recolors, so the game never needs `tint()`.

| Variant | For | Use |
| ------- | --- | --- |
| `*-flash.png` | fighter, bomber, gyro, AA gun, eye tower, Thought Police + escort, all bosses (normal and damaged) | Replaces the sprite for ~3 frames after a hit. |
| `*-shadow.png` | player (and banking frames), fighter, bomber, gyro, Thought Police + escort, propaganda blimp, all bosses (normal and damaged) | Drawn first at ~(+6, +10) px and ~40% alpha to fake altitude, like *1942*. Visible over plazas, invisible over asphalt. |
| `enemy-fighter-allied.png` | fighter | The level 4 "ally" lie: it looks like the player's plane on purpose. |

The Ministries of Plenty, Peace, and Love are one palette step darker than the Ministry of Truth, so the player stays the brightest object; Truth's pyramid loses its steps when darkened, and its whiteness is canonical.

## Illustrations (`public/assets/illustrations/`)

Side-view scenes, drawn at an integer scale (240×160 → 2× = 480×320).

| File | Size | Scene | Notes |
| ---- | ---- | ----- | ----- |
| `menu-city.png` | 240×160 | Menu | Stepped pyramid over the city at night; dark lower third for the menu. Regenerated from a pyramid sketch after the first try drew a spire. |
| `dictionary-cover.png` | 96×128 | Dictionary | Red eye emblem, no title. |
| `vaporized.png` | 240×160 | Game over | Squadron photo with one pilot's head erased: the diarist, and now the player. |
| `pilot-portrait.png` | 64×64 | Ministry, endings | Pilot 6079, the player; same style as the Leader and the Officer so they can face each other. |
| `officer-portrait.png` | 64×64 | Dictionary (briefing), Ministry | The Inner Party officer who gives the pilot orders: a face for the regime besides the leader. Completes the trio leader–officer–pilot. |
| `memory-hole.png` | 240×160 | Ministry | A records clerk at his typewriter beside the memory hole, the slot where records are burned. The real score goes down the hole before the official one is typed. |
| `pause-telescreen.png` | 240×160 | Pause | A telescreen eye with a red iris: even stopping is watched. |
| `ending-obedient.png` | 240×160 | Obedient ending | The pilot alone in a café under the Leader's telescreen. Uses red. |
| `ending-rebel.png` | 240×160 | Rebel ending | The pilot's plane over open country, pale sky. No red; the only bright scene. |

**Favicon:** `public/favicon.png` (64×64), the lens of `boss-eye.png`. It reads as an eye even at 16 px.

## Fonts (`public/assets/fonts/`)

`VT323-Regular.ttf` and `CourierPrime-Regular.ttf`, both SIL OFL 1.1 (license files alongside). Usage: [text-and-language.md](text-and-language.md).

## Assets that need p5 additions

Some assets are deliberately incomplete: p5 draws the moving or changing part at runtime.

| Asset | Required | Optional | Step |
| ----- | -------- | -------- | ---- |
| Every aircraft | `-shadow` variant drawn first. | — | 1 |
| Player | Blink while invulnerable (skip frames). | Dash afterimages: 2–3 copies at decreasing alpha. | 1, 3 |
| `menu-city.png` | Title and options in the dark lower third. | Two translucent searchlight triangles sweeping. | 1 |
| `vaporized.png` | Red "VAPORIZED" stamp (rotated red outline + VT323 word) after a short delay. | One-frame screen shake as it lands. | 1 |
| `enemy-aa-gun.png` | **Twin barrels**: two parallel 3 px `#3a3a3a` lines with a `#1a1a1a` outline, ~18 px, rotated toward the player each frame; shots leave from the tips. | 2-frame `#e8e4d8` muzzle flash. | 2 |
| `enemy-gyro.png` | **Rotor**: two crossed `#7a7a7a` lines, ~40 px, rotating over the hub, drawn after the body. | Rotor at 60% alpha. | 2 |
| `eye-tower.png` | **Vision cone** (`arc(..., PIE)`) from the lens, drawn before the tower; grey idle, red detecting. | — | 2 |
| `thought-police.png`, `boss-*.png` | Hp bar and `-flash` on hit. | Blinking outline on weak points; pulsing red lights. | 2, 4 |
| `boss-eye.png` | **Pupil**: a `#1a1a1a` circle over the lens, shifted toward the player. | Pupil narrows as hp drops. | 4 |
| `boss-landship.png` | — (scrolls with the ground). | Muzzle flash on the main cannon. | 4 |
| `diary.png` | ~60% alpha. | One-pixel glint every few seconds. | 3 |
| `enemy-fighter.png` (camo) | Very low alpha unless TRUTH is active. | — | 3 |
| `dictionary-cover.png` | Edition title ("DICTIONARY OF NEWSPEAK — 11th EDITION") and word list with red strike-throughs, in Courier Prime. | — | 3 |
| Endings | Text typed below the illustration; the rebel ending also shows the diary pages read. | — | 4 |
| `diary.png` (pickup) | One line of the page typed at the bottom of the screen on a leather band, without pausing. | — | 3 |
| `pilot-portrait.png` | — | Thin frame and pilot ID caption. | 4 |
| `poster-leader.png` | **Mural**: red frame + `#1a1a1a` slogan band with VT323 text. | Slogan flips mid-level with a one-frame flicker. | 5 |
| `propaganda-blimp.png` | **Towed banner**: tow line and a light banner with dark VT323 text behind the blimp. | Banner sways slightly. | 5 |
| `boss-*-damaged.png` | Reveal damage regions progressively from `boss-*-damage.json`, never a single swap. | Smoke: grey particles from the revealed holes, more as more regions show. | 4 |
| `player-bank-*.png` | Use while the horizontal input is held. | — | Polish |
| `officer-portrait.png` | Briefing text next to it (Courier Prime); colder lines as suspicion rises. | Thin frame, rank caption. | 4 |
| `memory-hole.png` | The crossed-out real score slides into the slot before the official one is typed. | Papers fluttering into the slot. | 4 |
| `pause-telescreen.png` | "PAUSED" in VT323. | Suspicion creeps up slowly while paused. | 5 |

## Drawn entirely with p5

| Element | Why |
| ------- | --- |
| Regime red in the world | Party banners on rooftops, warning lamps, red vignette, red regime bullets, stamps. Drawn by code so it can react to suspicion; full list in [art-direction.md](art-direction.md). |
| Bullets | Hundreds of 2–4 px circles; `p.circle()` is as cheap as an image and can change size and color. |
| Drones | Grey circle, red eye, four rotating rotor lines. |
| Explosions | Expanding circles and particles fading over ~20 frames; sprite animations would cost many generations. |
| Word pickups | Dynamic text, with a red strike-through when removed. |
| Buildings | Procedural rooftops: `#3a3a3a` roof, `#1a1a1a` parapet, `#7a7a7a` vents, tanks, hatches. The generator drew buildings in perspective. |
| Diary hiding spots | Rooftop skylights (`#1a1a1a` rectangle, `#3a3a3a` grid) in the procedural rooftops, so players learn where to look. |
| Slogans, ground lettering, telescreens | Text and animated content that change during play. |
| HUD, ticker, scanlines, glitch, typewriter | Text and screen effects. |

## How the assets were made

Made with [PixelLab](https://pixellab.ai), post-processed with ImageMagick and small Pillow (Python) scripts. The set is complete; this section documents how it was made, so a problem can be fixed without generating anything new.

### Generating

- **Tools:** `create_image_pixflux` (1 generation per image); `create_topdown_tileset` (~4). Inpainting and editing cost 20–40, so they are out of reach on the trial.
- **Forced palette:** every request includes a tiny PNG of the allowed colors: the 4 core colors, plus red only for regime assets. Terrain tones are applied afterwards, when remapping tilesets.
- **Sketch + img2img:** top-down shapes are only reliable from a flat palette sketch (an ImageMagick MVG file) passed as `init_image`. `init_image_strength` 40–60 lets the AI add detail; 80 keeps the sketch nearly unchanged; ~110 on a full scene restyles it while keeping its composition. A portrait init at ~30 transfers style to a new character.
- **Known limits:** buildings come out in perspective; aircraft under 48 px break; small edits (banking, battle damage) are ignored even at img2img 80–150; linear features (rails) don't fit Wang tilesets; dark subjects can come out pure `#1a1a1a`, invisible on the ground. Landmarks need a sketch: at strength ~70 the result is faithful but flat, at ~40–55 it adds detail but may drop features, so retouch locally (roof ribs, red lights).
- **Make it locally instead** when the change is geometric or small: it is exact, consistent, and free.

### Post-processing

```sh
# Darken one palette step (enemy vs player contrast)
magick in.png -fill '#3a3a3a' -opaque '#7a7a7a' -fill '#7a7a7a' -opaque '#e8e4d8' out.png

# Remap a single-material tileset (asphalt ↔ plaza) to two dark ground tones (ground-palette = #1a1a1a, #3a3a3a)
magick raw.png -alpha off -colorspace gray -auto-level -fx 'u*0.30' -colorspace sRGB \
  -dither None -remap ground-palette.png PNG24:out.png

# Flash and shadow variants
magick in.png -fill '#e8e4d8' -colorize 100 PNG32:in-flash.png
magick in.png -fill '#1a1a1a' -colorize 100 PNG32:in-shadow.png

# Crisp edges (binary alpha)
magick in.png -channel A -threshold 50% +channel PNG32:out.png
```

Pure-black results (Thought Police, flying fortress) were lifted one tone. They then got a top-left rim highlight (the alpha mask minus itself shifted 2 px) and a 1 px `#1a1a1a` outline behind them (the alpha mask dilated 1 px).

Local scripts (Pillow), kept out of the repo:

- **Damage map** (`boss-*-damage.json`): diff the clean and damaged sprites, group changed pixels within 3 px into regions, drop regions under 3 px, then order them: holes (≥ 40 px) first, cracks last, shuffled within each group with seed `1984` so damage spreads over the hull.
- **Battle damage** (`boss-*-damaged.png`): pick 5–6 points well inside the silhouette (opaque in a ±6 px box, ≥22 px apart). Each gets a ragged hole (transparent, radius 2.5–4.5 px with jitter), a 1.5 px `#1a1a1a` burnt rim, and a scorch ring of random dark pixels; then add 6 short random-walk cracks. Regime red is never overwritten. Seed `1984`.
- **Banking frames:** keep the fuselage columns, foreshorten the lowered wing to ~62% width and darken it one step, lighten a few mid-grey pixels on the raised wing; mirror for the other side.
- **Railway strip:** 48×32, gravel bed (`#3a3a3a` with 28% `#1a1a1a` speckle), two wooden sleepers (`#4a3426` with `#33251f` edges), two 2 px `#7a7a7a` rails with a dark shadow. Independent per-pixel noise keeps it seamless along y.
- **Red ramp** (every asset with `#b3261e`): find each 4-connected red region. A region touching the image edge is a background: dither it toward `#6e1712` with a 4×4 Bayer matrix, starting 55% of the way from the center to the edge (a printed-poster vignette). Regions of 4+ px: bottom-right rim pixels → `#6e1712`, top-left rim → `#e0503a`. Regions under 4 px (lamps) → `#e0503a`. Rerun the damage map afterwards if a boss changed.
- **Material recolor** (diary, AA gun): map `#7a7a7a` / `#3a3a3a` to material tones — the diary cover to leather (`#6e4a38` / `#5a3c2e`), and only the AA gun's sandbag ring (outside radius 12.5 px) to burlap (`#6e4a38` / `#4a3426`).
- **Tileset remap by nearest reference** (river, rubble): luminance remapping merges different materials, so each raw pixel takes the target of its nearest reference color from a hand-made table. River: blue-grey → asphalt, navy → water `#2b3b45`, green ripples → `#1f2b33`, cream → stone `#7a7a7a`, purple face → `#3a3a3a`. Rubble: blue-grey → asphalt, mortar → `#33251f`, bricks → `#5a3c2e` / `#6e4a38`, gold curb → `#3a3a3a`. Light ripples were rejected because they read as bullets.

**Verify** every export with `magick file.png -unique-colors txt:`. Only palette colors may appear, in the groups allowed for that asset (core everywhere, the red ramp on regime assets, material tones where documented; aircraft core only); `#00000000` is fully transparent and fine.

## Source and license

- **Project license:** [PolyForm Noncommercial 1.0.0](../LICENSE), noncommercial use only; see the [README](../README.md#license). The items below keep their own terms on top of it.
- **Images:** generated with [PixelLab](https://pixellab.ai) (free trial) with the palette forced, then post-processed with ImageMagick. The damaged bosses, banking frames, railway, red-ramp shading, and material recolors were made locally with scripts ([how they were made](#how-the-assets-were-made)). **Check PixelLab's terms on redistribution before a public release.**
- **Fonts:** from the [Google Fonts repository](https://github.com/google/fonts), SIL OFL 1.1. The license files must ship with them.
