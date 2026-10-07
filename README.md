# Newspeak 1984

A vertical scrolling shoot 'em up inspired by Capcom's *1942*, set in the world of George Orwell's *Nineteen Eighty-Four*.

You fly for the Party. The longer you fly, the more you see, and the more you see, the more the Party sees you. The dystopia comes through in the mechanics, not just the art: the game watches you, takes your abilities away, and lies to you about how you are doing.

> **Status:** early development. The project is scaffolded, the art and design documentation are complete, and the gameplay is being built step by step.

## The game

- **Surveillance.** Watchtowers and patrol drones sweep the screen with vision cones. Staying in their sight raises your **suspicion**. As suspicion rises, enemies spawn more often and start chasing you. At 100, the Thought Police come for you.
- **Newspeak.** Your power-ups are words: `FREE` (spread shot), `ESCAPE` (dash), `TRUTH` (see through the lies), and `REMEMBER` (bomb). From level 2 on, the Party removes one word per level, and with it the ability it grants. Hidden diaries can bring a word back for a level, but reading one draws attention.
- **Doublethink.** The HUD is propaganda. Your lives, your score, and even which enemies are allies may be false. Every lie has a subtle tell, and `TRUTH` exposes them all.
- **Ministry of Truth.** At the end of each level, your score is crossed out and replaced with an "official" score that rewards obedience. Past high scores can quietly change or disappear.
- **Two endings.** One for the obedient pilot and one for the pilot who defects.
- **English and Spanish.** The game starts in English, and you can switch it in the menu; it remembers your choice.

## Tech stack

- [TypeScript](https://www.typescriptlang.org/) (strict mode)
- [Vite](https://vite.dev/)
- [p5.js](https://p5js.org/) in instance mode
- [Vitest](https://vitest.dev/) for tests, GitHub Actions for CI and deploys to GitHub Pages

## Getting started

### Requirements

- Node.js 22.12+
- pnpm

### Run locally

```sh
git clone https://github.com/CarlosSandoval-03/Newspeak-1984.git
cd Newspeak-1984
pnpm install
pnpm dev
```

Open http://localhost:5173 in your browser.

### Scripts

| Command          | Description                               |
| ---------------- | ----------------------------------------- |
| `pnpm dev`       | Start the dev server with hot reload      |
| `pnpm typecheck` | Type-check the project without emitting   |
| `pnpm test`      | Run the tests                             |
| `pnpm build`     | Type-check and build to `dist/`           |
| `pnpm preview`   | Serve the production build locally        |

## Documentation

The design and technical documentation lives in [`docs/`](docs/README.md): start at [docs/README.md](docs/README.md), the game in one page and a map of the rest. The code layout is in [technical.md › Project structure](docs/technical.md#project-structure).

## License

Newspeak 1984 is source-available under the [PolyForm Noncommercial License 1.0.0](LICENSE). You may use, study, modify, and share it for any noncommercial purpose: personal use, study, research, hobby projects, and noncommercial organizations. **Commercial use requires written permission from the author**; ask through the [repository](https://github.com/CarlosSandoval-03/Newspeak-1984).

This is not an OSI open-source license, because it restricts commercial use.

Third-party parts keep their own licenses:

- The fonts in `public/assets/fonts/` are under the SIL Open Font License 1.1 (license files alongside).
- The images were generated with PixelLab and post-processed; their use is also subject to PixelLab's terms.

## Acknowledgements

- *1942* (Capcom, 1984) for the gameplay foundation.
- *Nineteen Eighty-Four* (George Orwell, 1949) for the world. All slogans in the game are original.
- [PixelLab](https://pixellab.ai) for generating the pixel art.
