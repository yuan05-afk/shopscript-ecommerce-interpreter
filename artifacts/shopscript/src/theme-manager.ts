export const THEMES = [
  "default",
  "emerald-gold",
  "midnight",
  "cyber-ochre",
] as const;

export type Theme = typeof THEMES[number];

export type ThemeOption = {
  readonly id: Theme;
  readonly label: string;
  readonly description: string;
  readonly swatches: readonly [string, string, string];
};

export const THEME_STORAGE_KEY = "shopscript.theme";
export const DEFAULT_THEME: Theme = "default";

export const THEME_OPTIONS: readonly ThemeOption[] = [
  {
    id: "default",
    label: "Default Orange",
    description: "Current ShopScript orange and clean cream palette.",
    swatches: ["#fff8ed", "#111827", "#f97316"],
  },
  {
    id: "emerald-gold",
    label: "Emerald & Gold",
    description: "Premium cream, deep emerald, and refined gold accents.",
    swatches: ["#F9F9F6", "#0D3B2E", "#C5A059"],
  },
  {
    id: "midnight",
    label: "Crimson Dracula",
    description: "Minimal black, white, charcoal, and crimson editorial palette.",
    swatches: ["#0B0B0D", "#F4F4F4", "#C8102E"],
  },
  {
    id: "cyber-ochre",
    label: "Cyberpunk Ochre",
    description: "Neon amber, acid-lime, and matte black industrial cyberpunk.",
    swatches: ["#050505", "#F5F2D8", "#FFB300"],
  },
] as const;

export class ThemeManager {
  static readonly storageKey = THEME_STORAGE_KEY;
  static readonly defaultTheme = DEFAULT_THEME;

  static isTheme(value: unknown): value is Theme {
    return typeof value === "string" && (THEMES as readonly string[]).includes(value);
  }

  static getStoredTheme(storage: Storage | null = ThemeManager.safeStorage()): Theme {
    if (!storage) return DEFAULT_THEME;
    const saved = storage.getItem(THEME_STORAGE_KEY);
    return ThemeManager.isTheme(saved) ? saved : DEFAULT_THEME;
  }

  static applyTheme(theme: Theme, options: { persist?: boolean } = {}): Theme {
    const nextTheme = ThemeManager.isTheme(theme) ? theme : DEFAULT_THEME;
    if (typeof document !== "undefined") {
      document.documentElement.dataset.theme = nextTheme;
      document.documentElement.style.colorScheme = nextTheme === "midnight" || nextTheme === "cyber-ochre" ? "dark" : "light";
    }
    if (options.persist !== false) {
      ThemeManager.safeStorage()?.setItem(THEME_STORAGE_KEY, nextTheme);
    }
    return nextTheme;
  }

  static init(): Theme {
    return ThemeManager.applyTheme(ThemeManager.getStoredTheme(), { persist: false });
  }

  static next(current: Theme): Theme {
    const index = THEMES.indexOf(current);
    return THEMES[(index + 1) % THEMES.length];
  }

  private static safeStorage(): Storage | null {
    try {
      return typeof window !== "undefined" ? window.localStorage : null;
    } catch {
      return null;
    }
  }
}