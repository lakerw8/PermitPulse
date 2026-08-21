/* Hallmark · genre: modern-minimal · component: theme-toggle · design-system: design.md · designed-as-app */
"use client";

import { useSyncExternalStore } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import {
  subscribeToTheme,
  getThemeSnapshot,
  getThemeServerSnapshot,
  setTheme,
  type Theme,
} from "@/lib/theme-store";

const ORDER: Theme[] = ["light", "dark", "system"];

const ICONS: Record<Theme, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

const LABELS: Record<Theme, string> = {
  light: "Light",
  dark: "Dark",
  system: "System",
};

/**
 * Cycles light to dark to system. A three-way cycle keeps the control to a
 * single icon-sized target, which is what the floating pill nav has room for.
 */
export function ThemeToggle() {
  const theme = useSyncExternalStore(
    subscribeToTheme,
    getThemeSnapshot,
    getThemeServerSnapshot
  );

  const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];
  const Icon = ICONS[theme];

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      title={`Theme: ${LABELS[theme]}. Switch to ${LABELS[next]}.`}
      aria-label={`Theme: ${LABELS[theme]}. Switch to ${LABELS[next]}.`}
      className="rounded-full p-1.5 text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring cursor-pointer"
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
