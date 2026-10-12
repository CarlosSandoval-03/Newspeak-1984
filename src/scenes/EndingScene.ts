import type p5 from "p5";
import type { Assets } from "../assets";
import { CANVAS_WIDTH, INK, PAPER } from "../config";
import type { Scene } from "../core/Scene";
import type { SceneManager } from "../core/SceneManager";
import { currentStrings, format, t } from "../i18n";
import { state } from "../state";
import {
  enterHonorRoll,
  type HonorRollEntry,
  readHonorRoll,
} from "../systems/HonorRoll";
import {
  drawCursor,
  type PageLine,
  scoreDigits,
  stack,
  Typewriter,
  wrap,
} from "../ui/effects";
import { drawHonorRoll } from "../ui/honorRollTable";
import { MenuScene } from "./MenuScene";

// Illustrations fill the top half at 2×; the text runs under them.
const ILLUSTRATION_HEIGHT = 320;
const MARGIN = 24;
const TITLE_Y = 356;
const TITLE_SIZE = 20;
const PROSE_Y = 392;
const PROSE_SIZE = 16;
const PROSE_COLUMNS = 45;
const PARAGRAPH_GAP = 8;
const SCORE_Y = 584;
const NUMBER_X = 312;
const HONOR_ROLL_Y = 356;
const PROMPT_Y = 632;
const PROMPT_SIZE = 20;

// One page of an ending: lines typed in the paperwork's face, under an illustration or not, and
// the honor roll beneath them on the page that shows it.
interface EndingPage {
  illustration: keyof Assets["image"] | null;
  lines: PageLine[];
  honorRoll: boolean;
}

// The run's last screens, typed a page at a time. Reaching them completes the run, the only kind
// the honor roll records.
export class EndingScene implements Scene {
  private readonly p: p5;
  private readonly manager: SceneManager;
  private readonly pages: EndingPage[];
  private readonly honorRoll: HonorRollEntry[];
  private page = 0;
  private typing: Typewriter;

  constructor(p: p5, manager: SceneManager) {
    this.p = p;
    this.manager = manager;
    enterHonorRoll(state.pilotId, state.officialScore);
    this.honorRoll = readHonorRoll();
    this.pages = obedientPages();
    this.typing = typewriterFor(this.pages[0]);
  }

  private get current(): EndingPage {
    return this.pages[this.page];
  }

  enter(): void {}

  // Enter first finishes the page, then turns it; after the last one, the Menu.
  update(): void {
    if (this.manager.input.wasPressed("confirm")) {
      if (this.typing.done) {
        this.turn();
        return;
      }
      this.typing.finish();
    }
    this.typing.update();
  }

  // The illustration, the page typed so far with its cursor, the honor roll if the page shows it,
  // and the prompt once the page is typed.
  draw(): void {
    const { p } = this;
    const { image, font } = this.manager.assets;
    const { illustration, lines, honorRoll } = this.current;

    p.background(INK);
    if (illustration) {
      p.imageMode(p.CORNER);
      p.image(image[illustration], 0, 0, CANVAS_WIDTH, ILLUSTRATION_HEIGHT);
    }

    p.noStroke();
    p.textFont(font.paperwork);
    p.textAlign(p.LEFT, p.BASELINE);
    lines.forEach((line, i) => this.drawLine(line, this.typing.shown(i)));
    if (!this.typing.done && this.typing.cursorVisible)
      drawCursor(p, lines, this.typing);

    p.textFont(font.machine);
    p.textSize(TITLE_SIZE);
    if (honorRoll)
      drawHonorRoll(p, this.honorRoll, CANVAS_WIDTH / 2, HONOR_ROLL_Y);
    if (this.typing.done) this.drawPrompt();
  }

  exit(): void {}

  private turn(): void {
    if (this.page === this.pages.length - 1) {
      this.manager.change(new MenuScene(this.p, this.manager));
      return;
    }
    this.page++;
    this.typing = typewriterFor(this.current);
  }

  private drawLine({ x, y, size }: PageLine, shown: string): void {
    const { p } = this;

    p.textSize(size);
    p.fill(PAPER);
    p.text(shown, x, y);
  }

  private drawPrompt(): void {
    const { p } = this;

    p.textSize(PROMPT_SIZE);
    p.textAlign(p.CENTER, p.BASELINE);
    p.fill(PAPER);
    p.text(t("endings.pressEnter"), CANVAS_WIDTH / 2, PROMPT_Y);
  }
}

function typewriterFor({ lines }: EndingPage): Typewriter {
  return new Typewriter(lines.map(({ text }) => text));
}

// The grateful citizen's story under his café, with the run's official score; then the honor roll,
// corrected one last time.
function obedientPages(): EndingPage[] {
  const { obedient } = currentStrings().endings;
  const story = obedient.lines.map((line) =>
    format(line, { id: state.pilotId }),
  );

  return [
    {
      illustration: "ending-obedient",
      lines: [
        ...stack([obedient.title], { x: MARGIN, y: TITLE_Y, size: TITLE_SIZE }),
        ...paragraphs(story, PROSE_Y),
        ...stack([t("ministry.officialScore")], {
          x: MARGIN,
          y: SCORE_Y,
          size: TITLE_SIZE,
        }),
        ...stack([scoreDigits(state.officialScore)], {
          x: NUMBER_X,
          y: SCORE_Y,
          size: TITLE_SIZE,
        }),
      ],
      honorRoll: false,
    },
    { illustration: "ending-obedient", lines: [], honorRoll: true },
  ];
}

// Prose wrapped to the page, a little space between paragraphs.
function paragraphs(texts: readonly string[], top: number): PageLine[] {
  const lines: PageLine[] = [];
  let y = top;

  for (const text of texts) {
    const block = stack(wrap(text, PROSE_COLUMNS), {
      x: MARGIN,
      y,
      size: PROSE_SIZE,
    });
    lines.push(...block);
    y = block[block.length - 1].y + PROSE_SIZE + PARAGRAPH_GAP;
  }
  return lines;
}
