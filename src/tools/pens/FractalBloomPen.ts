import { app } from "../../core/state";
import { FractalBloomEffect } from "../../effects";
import type { PenTool } from "../../types";

export class FractalBloomPen implements PenTool {
  draw(x: number, y: number): void {
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return;
    }

    const jitter = app.penSize * 0.04;
    const px = x + (Math.random() - 0.5) * jitter;
    const py = y + (Math.random() - 0.5) * jitter;
    app.effects.push(new FractalBloomEffect(px, py, app.penColor));
  }
}
