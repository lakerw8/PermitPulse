/* Hallmark · genre: modern-minimal · module: theme-store · design-system: design.md · designed-as-app */

/**
 * Light/dark preference.
 *
 * `design.md` defines both palettes but nothing ever applied the `.dark` class,
 * so the dark tokens were dead. This store owns the preference, mirrors it onto
 * the document, and follows the OS while the choice is "system".
 *
 * Read through `useSyncExternalStore` so the first client render already has the
 * right value. The initial class is applied by a blocking script in the document
 * head (`THEME_INIT_SCRIPT`) so the page never paints the wrong palette first.
 */

export type Theme = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "permitpulse:theme";

/**
 * Runs before first paint, inlined in <head>. Kept in sync with `applyTheme`
 * below: both resolve the same preference to the same class. Written as a
 * string because it must execute before React hydrates.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");var d=t==="dark"||((!t||t==="system")&&window.matchMedia("(prefers-color-scheme: dark)").matches);var e=document.documentElement;e.classList.toggle("dark",d);e.style.colorScheme=d?"dark":"light"}catch(_){}})()`;

const listeners = new Set<() => void>();

function readStored(): Theme {
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (raw === "light" || raw === "dark" || raw === "system") return raw;
  } catch {
    // Storage denied; fall back to following the OS.
  }
  return "system";
}

let cached: Theme | null = null;

function prefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function resolveTheme(theme: Theme): "light" | "dark" {
  if (theme === "system") return prefersDark() ? "dark" : "light";
  return theme;
}

function applyTheme(theme: Theme): void {
  const dark = resolveTheme(theme) === "dark";
  const el = document.documentElement;
  el.classList.toggle("dark", dark);
  // Keeps native controls, scrollbars and form widgets on the same palette.
  el.style.colorScheme = dark ? "dark" : "light";
}

export function subscribeToTheme(onChange: () => void): () => void {
  listeners.add(onChange);
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  // While the choice is "system", an OS change must repaint immediately.
  const onSystemChange = () => {
    if (getThemeSnapshot() === "system") applyTheme("system");
    onChange();
  };
  media.addEventListener("change", onSystemChange);

  const onStorage = (event: StorageEvent) => {
    if (event.key !== THEME_STORAGE_KEY) return;
    cached = null;
    applyTheme(getThemeSnapshot());
    onChange();
  };
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(onChange);
    media.removeEventListener("change", onSystemChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function getThemeSnapshot(): Theme {
  if (cached === null) cached = readStored();
  return cached;
}

/** The server cannot know the preference; the head script corrects it. */
export function getThemeServerSnapshot(): Theme {
  return "system";
}

export function setTheme(theme: Theme): void {
  cached = theme;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Choice still applies for this session.
  }
  applyTheme(theme);
  for (const listener of listeners) listener();
}
