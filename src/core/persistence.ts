import type { Color } from "../types";
import { hexToRgb, rgbToHex } from "./color";

const SETTINGS_KEY = "hikari-no-crayon:settings:v1";

export interface PersistedSettings {
  pen: string;
  size: number;
  colorHex: string;
  rainbowMode: boolean;
  fadeMode: boolean;
  autoMode: boolean;
  exportScale: number;
  exportTransparent: boolean;
}

export const defaultPersistedSettings: PersistedSettings = {
  pen: "normal_pen",
  size: 40,
  colorHex: rgbToHex({ r: 55, g: 200, b: 120 }),
  rainbowMode: false,
  fadeMode: false,
  autoMode: false,
  exportScale: 1,
  exportTransparent: false,
};

export function loadSettings(): PersistedSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      return { ...defaultPersistedSettings };
    }

    const parsed = JSON.parse(raw) as Partial<PersistedSettings>;
    return {
      ...defaultPersistedSettings,
      ...parsed,
      size: Number(parsed.size ?? defaultPersistedSettings.size),
      exportScale: Number(parsed.exportScale ?? defaultPersistedSettings.exportScale),
      colorHex: typeof parsed.colorHex === "string" ? parsed.colorHex : defaultPersistedSettings.colorHex,
    };
  } catch {
    return { ...defaultPersistedSettings };
  }
}

export function saveSettings(settings: PersistedSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function colorFromSettings(hex: string): Color {
  return hexToRgb(hex);
}
