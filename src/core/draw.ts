import { app, requireMainContext, requirePreviewContext } from "./state";
import { colorToString, hsvToRgb } from "./color";
import { d2r } from "./math";
import type { Color, Point } from "../types";

export function clear(context: CanvasRenderingContext2D): void {
  context.globalCompositeOperation = "source-over";
  context.fillStyle = "#000000";
  context.fillRect(0, 0, app.width, app.height);
  if (context === app.c) {
    context.globalCompositeOperation = getDrawCompositeOperation();
  } else {
    context.globalCompositeOperation = "lighter";
  }
}

export function getDrawCompositeOperation(): GlobalCompositeOperation {
  return app.isYamiMode ? "source-over" : "lighter";
}

export function applyDrawCompositeOperation(): void {
  const c = requireMainContext();
  c.globalCompositeOperation = getDrawCompositeOperation();
}

export function drawCircle(x: number, y: number, r: number, color: Color, p: number, q: number): void {
  const c = requireMainContext();
  const grad = c.createRadialGradient(x, y, 1, x, y, r);
  grad.addColorStop(p, colorToString(color, 0.7));
  grad.addColorStop(q, "rgba(0, 0, 0, 0)");
  c.fillStyle = grad;
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2, false);
  c.fill();
  c.closePath();
}

export function drawPreviewCircle(x: number, y: number, r: number, color: Color): void {
  const preC = requirePreviewContext();
  const grad = preC.createRadialGradient(x, y, 1, x, y, r);
  grad.addColorStop(0.1, colorToString(color, 1));
  grad.addColorStop(1.0, "rgba(0, 0, 0, 0)");
  preC.fillStyle = grad;
  preC.beginPath();
  preC.arc(x, y, r, 0, Math.PI * 2, false);
  preC.fill();
  preC.closePath();
}

export function drawTriangle(pos1: Point, pos2: Point, pos3: Point, color: Color, a: number): void {
  const c = requireMainContext();
  c.fillStyle = colorToString(color, a);
  c.beginPath();
  c.moveTo(pos1.x, pos1.y);
  c.lineTo(pos2.x, pos2.y);
  c.lineTo(pos3.x, pos3.y);
  c.closePath();
  c.fill();
}

export function drawPoint(x: number, y: number, color: Color, a: number): void {
  const c = requireMainContext();
  c.fillStyle = colorToString(color, a);
  c.fillRect(x, y, 1, 1);
  c.closePath();
}

export function drawLineColor(spos: Point, epos: Point, color: Color, a: number, size: number): void {
  const c = requireMainContext();
  c.strokeStyle = colorToString(color, a);
  c.lineWidth = size;
  c.beginPath();
  c.moveTo(spos.x, spos.y);
  c.lineTo(epos.x, epos.y);
  c.stroke();
}

export function drawLines(posList: Point[], color: Color, a: number, size: number): void {
  if (posList.length < 2) {
    return;
  }

  for (let i = 1; i < posList.length; i += 1) {
    drawLineColor(posList[i - 1], posList[i], color, a, size);
  }
}

export function reverseImage(): void {
  const c = requireMainContext();
  const img = c.getImageData(0, 0, app.width, app.height);
  const pixels = img.data;
  const len = app.width * app.height;

  for (let i = 0; i < len; i += 1) {
    pixels[i * 4] = 255 - pixels[i * 4];
    pixels[i * 4 + 1] = 255 - pixels[i * 4 + 1];
    pixels[i * 4 + 2] = 255 - pixels[i * 4 + 2];
  }

  c.putImageData(img, 0, 0);
}

export function blurImage(): void {
  stackBlurCanvasRGB("canvas", 0, 0, app.width, app.height, app.blurRadius);
}

export function drawDarkCircle(x: number, y: number, r: number): void {
  const c = requireMainContext();
  c.globalCompositeOperation = "source-over";
  drawCircle(x, y, r, hsvToRgb(0, 0, 0), 0.2, 1.0);
  c.globalCompositeOperation = getDrawCompositeOperation();
}
