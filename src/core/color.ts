import type { Color } from "../types";

export function colorToString(color: Color, a: number): string {
  return `rgba(${Math.floor(color.r)},${Math.floor(color.g)},${Math.floor(color.b)},${a})`;
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
