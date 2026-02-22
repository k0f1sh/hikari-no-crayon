import { app } from "../../core/state";
import { FractalBloomEffect } from "../../effects";
import type { PenTool, Point } from "../../types";

export class FractalBloomPen implements PenTool {
  lastPoints = new Map<number | "default", Point>();

  private getPointerKey(): number | "default" {
    return typeof app.activePointerId === "number" ? app.activePointerId : "default";
  }

  clearPointerState(pointerId: number): void {
    this.lastPoints.delete(pointerId);
  }

  clearStrokeState(): void {
    this.lastPoints.clear();
  }

  draw(x: number, y: number): void {
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return;
    }

    const current: Point = { x, y };
    const pointerKey = this.getPointerKey();
    const lastPoint = this.lastPoints.get(pointerKey) ?? null;
    const jumpThreshold = Math.max(28, app.penSize * 8.5);
    const minDistance = Math.max(3, app.penSize * 0.22);

    if (!lastPoint) {
      this.lastPoints.set(pointerKey, current);
      return;
    }

    const dx = current.x - lastPoint.x;
    const dy = current.y - lastPoint.y;
    const dist = Math.hypot(dx, dy);

    if (dist > jumpThreshold) {
      this.lastPoints.set(pointerKey, current);
      return;
    }

    if (dist < minDistance) {
      return;
    }

    const unitX = dx / dist;
    const unitY = dy / dist;
    const mode = this.getMode();
    const maxLength = mode === "tree"
      ? Math.max(12, Math.min(108, app.penSize * 2.9))
      : Math.max(14, Math.min(140, app.penSize * 3.8));
    const from = dist > maxLength
      ? { x: current.x - unitX * maxLength, y: current.y - unitY * maxLength }
      : lastPoint;
    const depth = this.getDepth();
    const revealPerFrame = Math.max(4, 4 + app.penSize / 4.5);
    const alpha = Math.min(0.42, 0.26 + app.penSize / 460);
    app.effects.push(
      new FractalBloomEffect(from.x, from.y, current.x, current.y, app.penColor, {
        mode,
        depth,
        alpha,
        lineWidth: Math.max(1, app.penSize / 90),
        revealPerFrame,
      }),
    );
    this.lastPoints.set(pointerKey, current);
  }

  getDepth(): number {
    if (app.penSize < 8) {
      return 2;
    }
    if (app.penSize < 20) {
      return 3;
    }
    if (app.penSize < 45) {
      return 4;
    }
    return 5;
  }

  getMode(): "tree" | "koch" {
    const params = app.penCustomParams.fractal_bloom_pen;
    const useKoch = params?.use_koch === true;
    return useKoch ? "koch" : "tree";
  }
}
