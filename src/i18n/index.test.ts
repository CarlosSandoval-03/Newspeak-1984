import {
  afterEach,
  beforeEach,
  describe,
  expect,
  expectTypeOf,
  it,
  vi,
} from "vitest";
import {
  currentLanguage,
  detectLanguage,
  initLanguage,
  setLanguage,
  t,
} from "./index";

// Node has no browser globals; these stand in for the ones the module touches.
function stubBrowser(search = "", storage: Partial<Storage> = {}) {
  const html = { lang: "" };
  const saved = new Map<string, string>();

  vi.stubGlobal("document", { documentElement: html });
  vi.stubGlobal("location", { search });
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => saved.get(key) ?? null,
    setItem: (key: string, value: string) => saved.set(key, value),
    ...storage,
  });

  return { html, saved };
}

const blocked = () => {
  throw new Error("storage is blocked");
};

describe("detectLanguage", () => {
  it("starts in English with no request and no saved choice", () => {
    expect(detectLanguage("", null)).toBe("en");
  });

  it("uses the saved choice", () => {
    expect(detectLanguage("", "es")).toBe("es");
  });

  it("lets ?lang= override the saved choice", () => {
    expect(detectLanguage("?lang=en", "es")).toBe("en");
    expect(detectLanguage("?lang=es", "en")).toBe("es");
  });

  it("skips unsupported codes", () => {
    expect(detectLanguage("?lang=fr", "es")).toBe("es");
    expect(detectLanguage("", "de")).toBe("en");
  });
});

describe("the current language", () => {
  beforeEach(() => stubBrowser());
  afterEach(() => {
    setLanguage("en");
    vi.unstubAllGlobals();
  });

  it("is read from the URL and the saved choice at startup", () => {
    const { html } = stubBrowser("?lang=es");

    initLanguage();

    expect(currentLanguage()).toBe("es");
    expect(html.lang).toBe("es");
  });

  it("starts in English when storage is blocked", () => {
    stubBrowser("", { getItem: blocked });

    initLanguage();

    expect(currentLanguage()).toBe("en");
  });

  it("is remembered when switched", () => {
    const { html, saved } = stubBrowser();

    setLanguage("es");

    expect(html.lang).toBe("es");
    expect(saved.get("newspeak1984.lang")).toBe("es");
  });

  it("still switches when storage is blocked", () => {
    stubBrowser("", { setItem: blocked });

    setLanguage("es");

    expect(currentLanguage()).toBe("es");
  });
});

describe("t", () => {
  beforeEach(() => stubBrowser());
  afterEach(() => {
    setLanguage("en");
    vi.unstubAllGlobals();
  });

  it("follows the current language", () => {
    expect(t("menu.start")).toBe("BEGIN SERVICE");

    setLanguage("es");

    expect(t("menu.start")).toBe("INICIAR SERVICIO");
  });

  it("fills placeholders", () => {
    expect(t("menu.language", { language: "ENGLISH" })).toBe(
      "LANGUAGE: ENGLISH",
    );
  });

  it("leaves a placeholder with no param visible", () => {
    expect(t("menu.language")).toBe("LANGUAGE: {language}");
  });

  // Checked by pnpm typecheck, not at runtime.
  it("only accepts paths to a single string", () => {
    expectTypeOf(t).toBeCallableWith("menu.start");
    // @ts-expect-error a misspelled key
    expectTypeOf(t).toBeCallableWith("menu.strat");
    // @ts-expect-error lists are read directly, not through t()
    expectTypeOf(t).toBeCallableWith("slogans.ground");
  });
});
