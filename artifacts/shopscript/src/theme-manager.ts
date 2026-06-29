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
type FaviconPalette = {
  readonly bgStart: string;
  readonly bgEnd: string;
  readonly bag: string;
  readonly ink: string;
  readonly accent: string;
};

const FAVICON_PALETTES: Record<Theme, FaviconPalette> = {
  default: {
    bgStart: "#ff9a3d",
    bgEnd: "#f97316",
    bag: "#fff7ed",
    ink: "#111827",
    accent: "#f97316",
  },
  "emerald-gold": {
    bgStart: "#0D3B2E",
    bgEnd: "#C5A059",
    bag: "#fffdf2",
    ink: "#0D3B2E",
    accent: "#C5A059",
  },
  midnight: {
    bgStart: "#0B0B0D",
    bgEnd: "#C8102E",
    bag: "#f4f4f4",
    ink: "#0B0B0D",
    accent: "#C8102E",
  },
  "cyber-ochre": {
    bgStart: "#050505",
    bgEnd: "#FFB300",
    bag: "#fff8c7",
    ink: "#050505",
    accent: "#FFB300",
  },
};
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
      ThemeManager.applyFavicon(nextTheme);
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

  static faviconDataUrl(theme: Theme): string {
    const palette = FAVICON_PALETTES[theme] ?? FAVICON_PALETTES.default;
    return "data:image/svg+xml," + encodeURIComponent(ThemeManager.createFaviconSvg(palette));
  }

  private static applyFavicon(theme: Theme): void {
    if (typeof document === "undefined") return;
    const palette = FAVICON_PALETTES[theme] ?? FAVICON_PALETTES.default;
    const href = ThemeManager.faviconDataUrl(theme);
    let link = document.querySelector<HTMLLinkElement>('link[data-shopscript-favicon]');

    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      link.type = "image/svg+xml";
      link.setAttribute("data-shopscript-favicon", "");
      document.head.appendChild(link);
    }

    link.href = href;
    let themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!themeColor) {
      themeColor = document.createElement("meta");
      themeColor.name = "theme-color";
      document.head.appendChild(themeColor);
    }
    themeColor.content = palette.bgEnd;
  }

  private static createFaviconSvg(palette: FaviconPalette): string {
    return `<svg width="180" height="180" viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="tile" x1="24" y1="20" x2="156" y2="162" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${palette.bgStart}"/><stop offset="1" stop-color="${palette.bgEnd}"/></linearGradient></defs><rect x="8" y="8" width="164" height="164" rx="38" fill="url(#tile)"/><path d="M58 75h64l-6.8 51.5A14 14 0 0 1 101.4 139H78.6a14 14 0 0 1-13.8-12.5L58 75Z" fill="${palette.bag}" fill-opacity="0.96"/><path d="M68 75c0-22 10.5-36 22-36s22 14 22 36" stroke="${palette.ink}" stroke-width="12" stroke-linecap="round"/><path d="M82 96l-16 14 16 14M98 96l16 14-16 14" stroke="${palette.accent}" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/><circle cx="128" cy="52" r="11" fill="${palette.ink}"/><path d="M128 47v10M123 52h10" stroke="${palette.bag}" stroke-width="4" stroke-linecap="round"/></svg>`;
  }
  private static safeStorage(): Storage | null {
    try {
      return typeof window !== "undefined" ? window.localStorage : null;
    } catch {
      return null;
    }
  }
}