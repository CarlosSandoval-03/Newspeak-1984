// Runs every benchmark scenario in headless Chromium and compares it with the saved baseline.
// Usage: pnpm bench [--only a,b] [--fes] [--save]. CHROME_BIN overrides the browser it finds.
import { spawn } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "vite";

const BUDGET_MS = 1000 / 60;
// Two frames' worth: a frame the browser had to drop, not timer jitter.
const DROPPED_MS = BUDGET_MS * 1.5;
// Slower than the baseline by more than this is flagged.
const REGRESSION = 0.2;
const BASELINE = new URL("baseline.json", import.meta.url);

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const only = args.includes("--only")
  ? args[args.indexOf("--only") + 1].split(",")
  : null;

function findChrome() {
  if (process.env.CHROME_BIN) return process.env.CHROME_BIN;
  const cache = join(homedir(), ".cache", "ms-playwright");
  const builds = existsSync(cache)
    ? readdirSync(cache)
        .filter((d) => /^chromium-\d+$/.test(d))
        .sort()
    : [];
  for (const build of builds.reverse()) {
    const bin = join(cache, build, "chrome-linux64", "chrome");
    if (existsSync(bin)) return bin;
  }
  for (const bin of [
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
    "/usr/bin/google-chrome",
  ])
    if (existsSync(bin)) return bin;
  throw new Error(
    "No Chromium found: set CHROME_BIN to a Chrome or Chromium binary.",
  );
}

async function launch(bin) {
  const profile = mkdtempSync(join(tmpdir(), "newspeak-bench-"));
  const chrome = spawn(bin, [
    "--headless=new",
    "--no-sandbox",
    "--remote-debugging-port=0",
    `--user-data-dir=${profile}`,
    "--window-size=480,640",
    // A hidden tab must not be throttled, or every frame would look slow.
    "--disable-background-timer-throttling",
    "--disable-renderer-backgrounding",
    "--disable-backgrounding-occluded-windows",
    "--enable-precise-memory-info",
    // Lets the page collect garbage before reading the heap, so only what stays alive is counted.
    "--js-flags=--expose-gc",
    "about:blank",
  ]);
  const port = await new Promise((resolve, reject) => {
    let log = "";
    chrome.stderr.on("data", (data) => {
      log += data;
      const match = log.match(/DevTools listening on ws:\/\/[^:]+:(\d+)\//);
      if (match) resolve(match[1]);
    });
    chrome.on("exit", () => reject(new Error(`Chromium exited:\n${log}`)));
  });
  const targets = await (
    await fetch(`http://127.0.0.1:${port}/json/list`)
  ).json();
  const ws = new WebSocket(
    targets.find((t) => t.type === "page").webSocketDebuggerUrl,
  );
  await new Promise((resolve) => ws.addEventListener("open", resolve));

  let id = 0;
  const pending = new Map();
  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    pending.get(message.id)?.(message.result);
    pending.delete(message.id);
  });
  const send = (method, params = {}) =>
    new Promise((resolve) => {
      pending.set(++id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });
  const evaluate = async (expression) =>
    (await send("Runtime.evaluate", { expression, returnByValue: true })).result
      .value;

  return {
    async open(url) {
      // Otherwise the last page's result could be read before the new one replaces it.
      await evaluate("delete window.__bench");
      await send("Page.navigate", { url });
      // The page publishes its result once the last frame is timed.
      for (let waited = 0; waited < 180_000; waited += 250) {
        await new Promise((resolve) => setTimeout(resolve, 250));
        const result = await evaluate("window.__bench");
        if (result) return result;
      }
      throw new Error(`Timed out on ${url}`);
    },
    close() {
      ws.close();
      chrome.kill();
      rmSync(profile, { recursive: true, force: true });
    },
  };
}

const quantile = (sorted, q) =>
  sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];

function summarize(raw) {
  const cpu = raw.update.map((u, i) => u + raw.draw[i]);
  const stats = (values) => {
    const sorted = [...values].sort((a, b) => a - b);
    return {
      mean: values.reduce((a, b) => a + b, 0) / values.length,
      p50: quantile(sorted, 0.5),
      p95: quantile(sorted, 0.95),
      p99: quantile(sorted, 0.99),
      max: sorted[sorted.length - 1],
    };
  };
  return {
    frames: cpu.length,
    update: stats(raw.update),
    draw: stats(raw.draw),
    cpu: stats(cpu),
    overBudget: cpu.filter((ms) => ms > BUDGET_MS).length,
    dropped: raw.interval.filter((ms) => ms > DROPPED_MS).length,
    enemies: Math.max(...raw.enemies),
    bullets: Math.max(...raw.bullets),
    explosions: Math.max(...raw.explosions),
    heapDeltaMB: raw.heapDelta / 2 ** 20,
  };
}

const ms = (value) => value.toFixed(2).padStart(6);
const versus = (value, base) => {
  if (base === undefined) return "";
  const change = (value - base) / base;
  const text = `${change >= 0 ? "+" : ""}${(change * 100).toFixed(0)}%`;
  return change > REGRESSION ? ` (${text} SLOWER)` : ` (${text})`;
};

// Cross-origin isolation gives performance.now() microseconds instead of 0.1 ms steps.
const server = await createServer({
  logLevel: "error",
  server: {
    port: 0,
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
});
await server.listen();
const root = server.resolvedUrls.local[0];
const browser = await launch(findChrome());
const fes = flag("fes") ? "1" : "0";

try {
  const { scenarios } = await browser.open(`${root}bench/`);
  const baseline = existsSync(BASELINE)
    ? JSON.parse(readFileSync(BASELINE, "utf8"))
    : {};
  const results = {};

  for (const name of scenarios.filter((s) => !only || only.includes(s))) {
    const key = fes === "1" ? `${name} (fes)` : name;
    const result = summarize(
      await browser.open(`${root}bench/?scenario=${name}&fes=${fes}`),
    );
    results[key] = result;
    const base = baseline[key];

    console.log(
      `${key.padEnd(22)} cpu p50 ${ms(result.cpu.p50)}  p95 ${ms(result.cpu.p95)}${versus(result.cpu.p95, base?.cpu.p95)}` +
        `  max ${ms(result.cpu.max)}${versus(result.cpu.max, base?.cpu.max)}`,
    );
    console.log(
      `${"".padEnd(22)} update p95 ${ms(result.update.p95)}  draw p95 ${ms(result.draw.p95)}` +
        `  over budget ${result.overBudget}/${result.frames}  dropped ${result.dropped}` +
        `  max on screen: ${result.enemies} enemies, ${result.bullets} bullets, ${result.explosions} explosions` +
        `  heap ${result.heapDeltaMB >= 0 ? "+" : ""}${result.heapDeltaMB.toFixed(1)} MB`,
    );
  }

  if (flag("save")) {
    writeFileSync(
      BASELINE,
      `${JSON.stringify({ ...baseline, ...results }, null, 2)}\n`,
    );
    console.log(`Baseline saved to ${BASELINE.pathname}`);
  }
} finally {
  browser.close();
  await server.close();
}
