export type MouseValue = number | "none" | null;

export interface Point {
  x: number;
  y: number;
}

export interface Color {
  r: number;
  g: number;
  b: number;
}

export interface MouseState {
  x: MouseValue;
  y: MouseValue;
}

export interface Effect {
  delFlg: boolean;
  move(): void;
  render(): void;
  delete(): void;
}

export interface PenTool {
  draw(x: number, y: number): void;
}

export type PenToolMap = Record<string, PenTool>;
