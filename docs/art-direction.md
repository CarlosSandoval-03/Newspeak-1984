# Art Direction

How *Newspeak 1984* looks and sounds, and why. Every file that implements it: [assets.md](assets.md). How text looks: [text-and-language.md › Typography](text-and-language.md#typography).

## Style

Pixel art seen from directly above, in the spirit of *1942*. Recognizable shapes (aircraft, towers, landmarks, portraits) are sprites; anything geometric, animated, or made of text is drawn by code.

## Palette

Three groups; their constants live in `config.ts`.

| Group | Colors | Used for |
| ----- | ------ | -------- |
| **Core** | `#1a1a1a` ink · `#3a3a3a` concrete · `#7a7a7a` steel · `#e8e4d8` paper | Everything: sprites, UI, text, illustrations. |
| **Regime red** | `#6e1712` dark · `#b3261e` base · `#e0503a` light | Only things that belong to the Party. Base for surfaces and marks, dark for shading and large fills, light only for highlights, small lights, and glows. Every red asset is shaded with the ramp. |
| **Material** | water `#1f2b33` / `#2b3b45` · brick `#33251f` / `#5a3c2e` / `#6e4a38` · wood `#4a3426` | Real materials, dark and muted on purpose: the ground layer (asphalt, plazas, water, rubble, tracks), things fixed to the ground (the AA gun's sandbags), and the diary, whose leather makes it the one human object among the propaganda. |

Each asset uses the groups that help it read. The exception is aircraft: they stay in core colors (plus red if they belong to the regime), so nothing on the ground ever competes with what the player must track.

## Value hierarchy

Dark ground, mid-grey enemies, the player brightest. Readability comes from brightness, not hue. Landmarks other than the white Ministry of Truth are one step darker for the same reason.

## Red belongs to the regime

Red is everywhere the regime is, and nowhere else: nothing the player owns is red, and the rebel ending has none. Most red is drawn by code, so it can react to play:

| Where | Red element | Step |
| ----- | ----------- | ---- |
| City | Hanging Party banners on procedural rooftops (base red, dark-red folds); blinking light-red warning lamps on antennas and ministries. | 1 |
| City | Rooftop murals in red frames; the blimp's banners trimmed in red. | 5 |
| Surveillance | Eye lenses; cones turn red while detecting; destroyed eyes burst in red sparks. | 2 |
| Suspicion | The meter fills in red; a red vignette at the screen edges pulses when seen and grows with suspicion; in pursuit it beats like a pulse. | 2, 5 |
| Regime forces | Thought Police and the Eye fire red bullets. Foreign enemies' bullets stay light, so a red bullet always means the Party is shooting at you. | 2, 4 |
| Paperwork | Strike-throughs; `CORRECTED` / `APPROVED` stamps in the Ministry; the `VAPORIZED` stamp. | 1, 3, 4 |
| Telescreens | Ticker on a dark-red strip; telescreen frames lit red. | 5 |

## Messages seen from the sky

Wall posters would be invisible from above, so the regime writes for the sky ([mockup](art/poster-mockup.png)):

1. **Rooftop murals:** the Leader's portrait in a red frame with a slogan band.
2. **Ground slogans:** huge letters painted on plazas, like road markings.
3. **Towed banners:** pulled across the screen by a propaganda blimp. They move, so they carry the slogans that flip and contradict each other.

What they say: [text-and-language.md › Channels](text-and-language.md#channels).

## The screen under strain

Permanent scanlines, plus a glitch that grows with suspicion. Together with the red vignette, the player feels watched without reading the meter.

## Sound

Not designed yet. Files go in `public/assets/sounds/`, played with the Web Audio API.
