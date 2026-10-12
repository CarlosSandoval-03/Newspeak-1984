import type p5 from "p5";
import type { Assets } from "../assets";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  INK,
  PAPER,
  PAUSE_DIM_ALPHA,
  STEEL,
} from "../config";
import { t } from "../i18n";

// The telescreen at 2×, with its words under it.
const SCREEN_Y = 96;
const TITLE_Y = 470;
const NOTE_Y = 510;
const RESUME_Y = 600;
const TITLE_SIZE = 40;
const TEXT_SIZE = 20;

// Over the stopped game: dimmed, the telescreen's eye, and the reminder that it is still on.
export function drawPause(p: p5, assets: Assets): void {
  const context = p.drawingContext as CanvasRenderingContext2D;
  const screen = assets.image["pause-telescreen"];
  const center = CANVAS_WIDTH / 2;

  p.noStroke();
  context.globalAlpha = PAUSE_DIM_ALPHA;
  p.fill(INK);
  p.rect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  context.globalAlpha = 1;

  p.imageMode(p.CORNER);
  p.image(screen, 0, SCREEN_Y, CANVAS_WIDTH, screen.height * 2);

  p.textFont(assets.font.machine);
  p.textAlign(p.CENTER, p.BASELINE);
  p.fill(PAPER);
  p.textSize(TITLE_SIZE);
  p.text(t("pause.title"), center, TITLE_Y);
  p.textSize(TEXT_SIZE);
  p.text(t("pause.note"), center, NOTE_Y);
  p.fill(STEEL);
  p.text(t("pause.resume"), center, RESUME_Y);
}
