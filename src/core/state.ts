import type { Color, Effect, MouseState, PenTool, PenToolMap } from "../types";

export const app = {
  canvas: null as HTMLCanvasElement | null,
  c: null as CanvasRenderingContext2D | null,
  preCanvas: null as HTMLCanvasElement | null,
  preC: null as CanvasRenderingContext2D | null,
  width: 0,
  height: 0,
  count: 0,
  mouse: { x: null, y: null } as MouseState,
  effects: [] as Effect[],
  isDown: false,
  isRainbowMode: false,
  isFadeMode: false,
  isAutoMode: false,
  margin: 40,
  toolboxWidth: 200,
  blurRadius: 15,
  penTools: {} as PenToolMap,
  penTool: null as PenTool | null,
  selectedPenName: "normal_pen",
  penSize: 30,
  penColor: { r: 200, g: 200, b: 200 } as Color,
  historyStack: [] as ImageData[],
  historyIndex: -1,
  didDrawInStroke: false,
};

export function requireMainContext(): CanvasRenderingContext2D {
  if (!app.c) {
    throw new Error("Main canvas context is not initialized");
  }
  return app.c;
}

export function requirePreviewContext(): CanvasRenderingContext2D {
  if (!app.preC) {
    throw new Error("Preview canvas context is not initialized");
  }
  return app.preC;
}

export function requireCanvas(): HTMLCanvasElement {
  if (!app.canvas) {
    throw new Error("Canvas is not initialized");
  }
  return app.canvas;
}
