import type { Color } from "../types";
import { hexToRgb, rgbToHex } from "./color";

const SETTINGS_KEY = "hikari-no-crayon:settings:v1";

export interface PersistedSettings {
  pen: string;
  size: number;
  colorHex: string;
  rainbowMode: boolean;
  rainbowSaturation: number;
  rainbowBrightness: number;
  fadeMode: boolean;
  autoMode: boolean;
  yamiMode: boolean;
  yamiStrength: number;
  symmetryMode: boolean;
  symmetryHud: boolean;
  symmetryType: "rotate" | "mirror";
  symmetryCount: number;
  symmetryOriginX: number;
  symmetryOriginY: number;
}

export const defaultPersistedSettings: PersistedSettings = {
  pen: "normal_pen",
  size: 64,
  colorHex: rgbToHex({ r: 86, g: 177, b: 255 }),
  rainbowMode: false,
  rainbowSaturation: 200,
  rainbowBrightness: 200,
  fadeMode: false,
  autoMode: false,
  yamiMode: false,
  yamiStrength: 100,
  symmetryMode: false,
  symmetryHud: true,
  symmetryType: "rotate",
  symmetryCount: 4,
  symmetryOriginX: 50,
  symmetryOriginY: 50,
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
      rainbowSaturation: Number(parsed.rainbowSaturation ?? defaultPersistedSettings.rainbowSaturation),
      rainbowBrightness: Number(parsed.rainbowBrightness ?? defaultPersistedSettings.rainbowBrightness),
      yamiStrength: Number(parsed.yamiStrength ?? defaultPersistedSettings.yamiStrength),
      symmetryCount: Number(parsed.symmetryCount ?? defaultPersistedSettings.symmetryCount),
      symmetryOriginX: Number(parsed.symmetryOriginX ?? defaultPersistedSettings.symmetryOriginX),
      symmetryOriginY: Number(parsed.symmetryOriginY ?? defaultPersistedSettings.symmetryOriginY),
      colorHex: typeof parsed.colorHex === "string" ? parsed.colorHex : defaultPersistedSettings.colorHex,
      symmetryType:
        parsed.symmetryType === "mirror" || parsed.symmetryType === "rotate"
          ? parsed.symmetryType
          : defaultPersistedSettings.symmetryType,
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
