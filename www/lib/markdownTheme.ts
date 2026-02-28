/**
 * Theme for markdown-generated slides: optional accent bar, background, and text colors.
 * Null = use default (no accent bar, white background, default title/body colors).
 */
export interface MarkdownSlideTheme {
  accentColor: string | null;
  backgroundColor: string | null;
  /** Title (H1) font color, hex. Null = default near-black */
  titleFontColor: string | null;
  /** Body and headings (H2–H6) font color, hex. Null = default gray */
  bodyFontColor: string | null;
}

export const THEME_PRESETS: {
  id: string;
  name: string;
  theme: MarkdownSlideTheme;
}[] = [
  {
    id: 'default',
    name: 'Default',
    theme: {
      accentColor: null,
      backgroundColor: null,
      titleFontColor: null,
      bodyFontColor: null,
    },
  },
  {
    id: 'slate',
    name: 'Slate',
    theme: {
      accentColor: '#94a3b8',
      backgroundColor: '#1e293b',
      titleFontColor: '#f1f5f9',
      bodyFontColor: '#94a3b8',
    },
  },
  {
    id: 'ocean',
    name: 'Ocean',
    theme: {
      accentColor: '#0ea5e9',
      backgroundColor: '#f0f9ff',
      titleFontColor: null,
      bodyFontColor: null,
    },
  },
  {
    id: 'forest',
    name: 'Forest',
    theme: {
      accentColor: '#059669',
      backgroundColor: '#f0fdf4',
      titleFontColor: null,
      bodyFontColor: null,
    },
  },
  {
    id: 'sunset',
    name: 'Sunset',
    theme: {
      accentColor: '#f59e0b',
      backgroundColor: '#fffbeb',
      titleFontColor: null,
      bodyFontColor: null,
    },
  },
  {
    id: 'navy',
    name: 'Navy',
    theme: {
      accentColor: '#60a5fa',
      backgroundColor: '#0f172a',
      titleFontColor: '#f8fafc',
      bodyFontColor: '#cbd5e1',
    },
  },
  {
    id: 'rose',
    name: 'Rose',
    theme: {
      accentColor: '#e11d48',
      backgroundColor: '#fff1f2',
      titleFontColor: null,
      bodyFontColor: null,
    },
  },
  {
    id: 'mint',
    name: 'Mint',
    theme: {
      accentColor: '#10b981',
      backgroundColor: '#ecfdf5',
      titleFontColor: null,
      bodyFontColor: null,
    },
  },
  {
    id: 'lavender',
    name: 'Lavender',
    theme: {
      accentColor: '#7c3aed',
      backgroundColor: '#f5f3ff',
      titleFontColor: null,
      bodyFontColor: null,
    },
  },
  {
    id: 'amber',
    name: 'Amber',
    theme: {
      accentColor: '#d97706',
      backgroundColor: '#fffbeb',
      titleFontColor: null,
      bodyFontColor: null,
    },
  },
  {
    id: 'sky',
    name: 'Sky',
    theme: {
      accentColor: '#0284c7',
      backgroundColor: '#f0f9ff',
      titleFontColor: null,
      bodyFontColor: null,
    },
  },
  {
    id: 'emerald',
    name: 'Emerald',
    theme: {
      accentColor: '#047857',
      backgroundColor: '#ecfdf5',
      titleFontColor: null,
      bodyFontColor: null,
    },
  },
  {
    id: 'violet',
    name: 'Violet',
    theme: {
      accentColor: '#6d28d9',
      backgroundColor: '#f5f3ff',
      titleFontColor: null,
      bodyFontColor: null,
    },
  },
  {
    id: 'stone',
    name: 'Stone',
    theme: {
      accentColor: '#57534e',
      backgroundColor: '#fafaf9',
      titleFontColor: null,
      bodyFontColor: null,
    },
  },
  {
    id: 'coral',
    name: 'Coral',
    theme: {
      accentColor: '#ea580c',
      backgroundColor: '#fff7ed',
      titleFontColor: null,
      bodyFontColor: null,
    },
  },
  {
    id: 'teal',
    name: 'Teal',
    theme: {
      accentColor: '#0d9488',
      backgroundColor: '#f0fdfa',
      titleFontColor: null,
      bodyFontColor: null,
    },
  },
  {
    id: 'indigo',
    name: 'Indigo',
    theme: {
      accentColor: '#4f46e5',
      backgroundColor: '#eef2ff',
      titleFontColor: null,
      bodyFontColor: null,
    },
  },
  {
    id: 'fuchsia',
    name: 'Fuchsia',
    theme: {
      accentColor: '#c026d3',
      backgroundColor: '#fdf4ff',
      titleFontColor: null,
      bodyFontColor: null,
    },
  },
  {
    id: 'cyan',
    name: 'Cyan',
    theme: {
      accentColor: '#0891b2',
      backgroundColor: '#ecfeff',
      titleFontColor: null,
      bodyFontColor: null,
    },
  },
  {
    id: 'random',
    name: 'Random',
    theme: {
      accentColor: '#6366f1',
      backgroundColor: '#eef2ff',
      titleFontColor: null,
      bodyFontColor: null,
    },
  },
];

/**
 * Returns a random but semi-coordinated theme (same hue, accent + pastel background).
 * Safe to call on client; use when user selects Random preset.
 */
export function getRandomTheme(): MarkdownSlideTheme {
  const hue = Math.floor(Math.random() * 360);
  const accentSat = 55 + Math.floor(Math.random() * 25);
  const accentLight = 35 + Math.floor(Math.random() * 20);
  const bgLight = 96 + Math.floor(Math.random() * 4);
  const bgSat = Math.min(30, Math.floor(accentSat * 0.4));
  const accent = hslToHex(hue, accentSat / 100, accentLight / 100);
  const bg = hslToHex(hue, bgSat / 100, bgLight / 100);
  return {
    accentColor: accent,
    backgroundColor: bg,
    titleFontColor: null,
    bodyFontColor: null,
  };
}

function hslToHex(h: number, s: number, l: number): string {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * c)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/** Hex #rrggbb to RGB 0–1 for Slides API */
export function hexToRgb(hex: string): {r: number; g: number; b: number} {
  const n = parseInt(hex.replace(/^#/, ''), 16);
  return {
    r: ((n >> 16) & 0xff) / 255,
    g: ((n >> 8) & 0xff) / 255,
    b: (n & 0xff) / 255,
  };
}
