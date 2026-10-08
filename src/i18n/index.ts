import { en, type Strings } from "./en";
import { es } from "./es";

const strings = { en, es };

export type Language = keyof typeof strings;

export const LANGUAGES = Object.keys(strings) as Language[];

// Lists are read from the strings object directly, so t() only reaches single strings.
type Path<T> = {
  [K in keyof T & string]: T[K] extends string
    ? K
    : T[K] extends readonly unknown[]
      ? never
      : `${K}.${Path<T[K]>}`;
}[keyof T & string];

const STORAGE_KEY = "newspeak1984.lang";

let current: Language = "en";

function isLanguage(code: string | null): code is Language {
  return code !== null && Object.hasOwn(strings, code);
}

// The browser's language is ignored on purpose: the game starts in English unless asked otherwise.
export function detectLanguage(search: string, saved: string | null): Language {
  const requested = new URLSearchParams(search).get("lang");

  if (isLanguage(requested)) return requested;
  if (isLanguage(saved)) return saved;
  return "en";
}

export function initLanguage(): void {
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(STORAGE_KEY);
  } catch {
    // Blocked storage only means no remembered choice.
  }

  current = detectLanguage(location.search, saved);
  document.documentElement.lang = current;
}

export function currentLanguage(): Language {
  return current;
}

export function setLanguage(language: Language): void {
  current = language;
  document.documentElement.lang = language;

  try {
    localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // The switch still applies; it just won't survive a reload.
  }
}

export function t(
  path: Path<Strings>,
  params: Record<string, string | number> = {},
): string {
  const text = path
    .split(".")
    .reduce<unknown>(
      (node, key) => (node as Record<string, unknown>)[key],
      strings[current],
    ) as string;

  // An unknown placeholder stays visible, so a missing param shows up on screen.
  return text.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    String(params[name] ?? placeholder),
  );
}
