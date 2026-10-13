import type p5 from "p5";
import type { Assets } from "../assets";
import {
  CANVAS_WIDTH,
  INK,
  LEATHER_DARK,
  PAPER,
  REBEL_DIARY_THRESHOLD,
} from "../config";
import { toSeconds } from "../core/math";
import type { Scene } from "../core/Scene";
import type { SceneManager } from "../core/SceneManager";
import { currentStrings, format, t } from "../i18n";
import { state } from "../state";
import {
  recordRun,
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
// The record: each row of the run as it happened, with what the Ministry made of it beneath.
const TABLE_TITLE_Y = 64;
const TABLE_Y = 120;
const ENTRY_STEP = 48;
const REAL_X = 384;
const OFFICIAL_INDENT = 16;
const OFFICIAL_DROP = 20;
const NOTE_Y = 424;
// A diary page is shown on its own leather, like the line read in flight.
const SHEET = { x: 12, y: 24, w: 456, h: 568 };
const DIARY_TITLE_Y = 64;
const DIARY_TEXT_Y = 104;
const PROMPT_Y = 632;
const PROMPT_SIZE = 20;

export type Ending = "obedient" | "rebel";

// Decided once the Eye is down, by the diary pages read in the whole run.
export function earnedEnding(): Ending {
  return state.runStats.diaries >= REBEL_DIARY_THRESHOLD ? "rebel" : "obedient";
}

// One page of an ending: lines typed in the paperwork's face, under an illustration or on a diary's
// leather, and the honor roll beneath them on the page that shows it.
interface EndingPage {
  illustration: keyof Assets["image"] | null;
  leather: boolean;
  lines: PageLine[];
  honorRoll: boolean;
}

// The run's last screens, typed a page at a time. Reaching them completes the run, which the honor
// roll records under its pilot.
export class EndingScene implements Scene {
  private readonly p: p5;
  private readonly manager: SceneManager;
  private readonly pages: EndingPage[];
  private readonly honorRoll: HonorRollEntry[];
  private page = 0;
  private typing: Typewriter;

  constructor(p: p5, manager: SceneManager, ending: Ending) {
    this.p = p;
    this.manager = manager;
    recordRun({
      pilotId: state.pilotId,
      score: state.officialScore,
      unperson: false,
    });
    this.honorRoll = readHonorRoll();
    this.pages = ending === "obedient" ? obedientPages() : rebelPages();
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

  // The illustration or the leather, the page typed so far with its cursor, the honor roll if the
  // page shows it, and the prompt once the page is typed.
  draw(): void {
    const { p } = this;
    const { image, font } = this.manager.assets;
    const { illustration, leather, lines, honorRoll } = this.current;

    p.background(INK);
    p.noStroke();
    if (illustration) {
      p.imageMode(p.CORNER);
      p.image(image[illustration], 0, 0, CANVAS_WIDTH, ILLUSTRATION_HEIGHT);
    }
    if (leather) {
      p.fill(LEATHER_DARK);
      p.rect(SHEET.x, SHEET.y, SHEET.w, SHEET.h);
    }

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
      leather: false,
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
    {
      illustration: "ending-obedient",
      leather: false,
      lines: [],
      honorRoll: true,
    },
  ];
}

// The pilot who did not land, under the open sky; then the record beside the truth; then every
// diary page read, in full.
function rebelPages(): EndingPage[] {
  const { rebel } = currentStrings().endings;
  const story = rebel.lines.map((line) => format(line, { id: state.pilotId }));

  return [
    {
      illustration: "ending-rebel",
      leather: false,
      lines: [
        ...stack([rebel.title], { x: MARGIN, y: TITLE_Y, size: TITLE_SIZE }),
        ...paragraphs(story, PROSE_Y),
      ],
      honorRoll: false,
    },
    { illustration: null, leather: false, lines: record(), honorRoll: false },
    ...state.runStats.pagesRead.map(diaryPage),
  ];
}

// The run as it happened, each row with the Ministry's version beneath it: its figures, which stop
// before the last level, or its denial where it admits nothing. The officers it filed as enemy
// aircraft are noted below.
function record(): PageLine[] {
  const { title, rows, official, denials, policeNote } =
    currentStrings().endings.rebel;
  const { realScore, officialScore, runStats } = state;
  const entries: [string, number, string | number][] = [
    [rows.score, realScore, officialScore],
    [rows.kills, runStats.kills, runStats.officialKills || denials.kills],
    [rows.eyesDestroyed, runStats.eyesDestroyed, denials.eyesDestroyed],
    [rows.policeDestroyed, runStats.policeDestroyed, denials.policeDestroyed],
    [rows.secondsSeen, toSeconds(runStats.framesSeen), denials.secondsSeen],
    [rows.diaries, runStats.diaries, denials.diaries],
  ];

  return [
    ...stack([title], { x: MARGIN, y: TABLE_TITLE_Y, size: TITLE_SIZE }),
    ...entries.flatMap(([item, real, recorded], i) => {
      const y = TABLE_Y + i * ENTRY_STEP;
      return [
        { text: item, x: MARGIN, y, size: PROSE_SIZE },
        { text: String(real), x: REAL_X, y, size: PROSE_SIZE },
        {
          text: format(official, { value: recorded }),
          x: MARGIN + OFFICIAL_INDENT,
          y: y + OFFICIAL_DROP,
          size: PROSE_SIZE,
        },
      ];
    }),
    ...(runStats.policeDestroyed > 0 ? paragraphs([policeNote], NOTE_Y) : []),
  ];
}

// One of the pages the pilot read in flight, whole at last.
function diaryPage(page: number): EndingPage {
  const { diary } = currentStrings();

  return {
    illustration: null,
    leather: true,
    lines: [
      ...stack([diary.title], {
        x: MARGIN,
        y: DIARY_TITLE_Y,
        size: TITLE_SIZE,
      }),
      ...paragraphs([diary.pages[page].page], DIARY_TEXT_Y),
    ],
    honorRoll: false,
  };
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
