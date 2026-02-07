import type { Color } from "../types";
import { app } from "./state";

export function colorToString(color: Color, a: number): string {
  const applied = applyYamiColor(color);
  return `rgba(${Math.floor(applied.r)},${Math.floor(applied.g)},${Math.floor(applied.b)},${a})`;
}

function applyYamiColor(color: Color): Color {
  if (!app.isYamiMode) {
    return color;
  }

  const strength = Math.max(0, Math.min(100, app.yamiStrength)) / 100;
  const keepRatio = 1 - strength;
  return {
    r: color.r * keepRatio,
    g: color.g * keepRatio,
    b: color.b * keepRatio,
  };
}

export function hsvToRgb(h: number, s: number, v: number): Color {
  let r: number;
  let g: number;
  let b: number;

  while (h < 0) {
    h += 360;
  }
  h %= 360;

  if (s === 0) {
    const value = Math.round(v);
    return { r: value, g: value, b: value };
  }

  const sRatio = s / 255;
  const i = Math.floor(h / 60) % 6;
  const f = h / 60 - i;
  const p = v * (1 - sRatio);
  const q = v * (1 - f * sRatio);
  const t = v * (1 - (1 - f) * sRatio);

  switch (i) {
    case 0:
      r = v;
      g = t;
      b = p;
      break;
    case 1:
      r = q;
      g = v;
      b = p;
      break;
    case 2:
      r = p;
      g = v;
      b = t;
      break;
    case 3:
      r = p;
      g = q;
      b = v;
      break;
    case 4:
      r = t;
      g = p;
      b = v;
      break;
    default:
      r = v;
      g = p;
      b = q;
      break;
  }

  return { r: Math.round(r), g: Math.round(g), b: Math.round(b) };
}

export function rgbToHex(color: Color): string {
  const toHex = (value: number) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, "0");
  return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
}

export function hexToRgb(hex: string): Color {
  const normalized = hex.replace("#", "");
  const value = normalized.length === 3
    ? normalized
        .split("")
        .map((char) => `${char}${char}`)
        .join("")
    : normalized;

  if (!/^[0-9a-fA-F]{6}$/.test(value)) {
    return { r: 200, g: 200, b: 200 };
  }

  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  };
}
