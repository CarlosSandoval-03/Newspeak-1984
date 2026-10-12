import { beforeEach, describe, expect, it } from "vitest";
import { CANVAS_WIDTH, TELL_FLICKER_FRAMES, TICKER_SPEED } from "../config";
import { currentStrings } from "../i18n";
import { Propaganda } from "../systems/Propaganda";
import { Ticker } from "./Ticker";

describe("Ticker", () => {
  let truth: number;
  let propaganda: Propaganda;
  let ticker: Ticker;
  // What each line on the strip reads, left to right.
  const shown = () => ticker["items"].map(({ news }) => ticker["text"](news));

  beforeEach(() => {
    truth = 0;
    propaganda = new Propaganda(
      {
        dashReady: () => true,
        truthReady: () => true,
        truthLeft: () => truth,
      },
      1,
    );
    ticker = new Ticker(propaganda, 1);
  });

  it("feeds the level's first line in at the right edge, and scrolls it left", () => {
    ticker.update();
    expect(ticker["items"]).toHaveLength(1);
    expect(ticker["items"][0].x).toBe(CANVAS_WIDTH);
    expect(shown()).toEqual(["EURASIA RAIDERS SIGHTED OVER THE CAPITAL"]);

    ticker.update();
    expect(ticker["items"][0].x).toBe(CANVAS_WIDTH - TICKER_SPEED);
  });

  it("follows each line with the next a gap behind, and drops the ones gone", () => {
    for (let i = 0; i < 2000; i++) ticker.update();
    const items = ticker["items"];

    for (const { x } of items) expect(x).toBeLessThanOrEqual(CANVAS_WIDTH);
    for (let i = 1; i < items.length; i++)
      expect(items[i].x).toBeGreaterThan(
        items[i - 1].x + ticker["width"](items[i - 1].news),
      );
    expect(ticker["width"](items[0].news) + items[0].x).toBeGreaterThan(0);
  });

  it("puts an announcement out next, ahead of the feed", () => {
    ticker.update();
    ticker.announce(currentStrings().ticker.raiderDowned, { n: 3 });
    while (ticker["items"].length < 2) ticker.update();

    expect(shown()[1]).toBe("EURASIA RAIDER DOWNED OVER SECTOR 3");
  });

  it("rewrites the lines already out when the war changes sides, flickering once, and says so", () => {
    ticker.update();
    propaganda.update(1);
    ticker.update();

    expect(shown()[0]).toBe("EASTASIA RAIDERS SIGHTED OVER THE CAPITAL");
    expect(ticker["flicker"]).toBe(TELL_FLICKER_FRAMES);
    while (ticker["items"].length < 2) ticker.update();
    expect(shown()[1]).toBe(
      "OCEANIA FIGHTS EASTASIA. THE RECORD CONFIRMS IT ALWAYS HAS.",
    );

    // TRUTH shows each line as it was written.
    truth = 0.5;
    expect(shown()[0]).toBe("EURASIA RAIDERS SIGHTED OVER THE CAPITAL");
  });
});
