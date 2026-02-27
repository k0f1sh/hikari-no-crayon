import { app } from "../../core/state";
import { FractalBloomEffect } from "../../effects";
import type { PenTool, Point } from "../../types";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

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
      : mode === "koch"
        ? Math.max(14, Math.min(140, app.penSize * 3.8))
        : Math.max(12, Math.min(126, app.penSize * 3.1));
    const from = dist > maxLength
      ? { x: current.x - unitX * maxLength, y: current.y - unitY * maxLength }
      : lastPoint;
    const depth = this.getDepth(mode);
    const revealPerFrame = this.getRevealPerFrame();
    const alpha = Math.min(0.58, 0.38 + app.penSize / 390);
    const treeOptions = mode === "tree" ? this.getTreeOptions() : {};
    const fernOptions = mode === "fern" ? this.getFernOptions() : {};
    app.effects.push(
      new FractalBloomEffect(from.x, from.y, current.x, current.y, app.penColor, {
        mode,
        depth,
        alpha,
        lineWidth: Math.max(1, app.penSize / 90),
        revealPerFrame,
        ...treeOptions,
        ...fernOptions,
      }),
    );
    this.lastPoints.set(pointerKey, current);
  }

  getDepth(mode: "tree" | "koch" | "fern"): number {
    if (mode === "koch") {
      const kochDepth = Number(app.penCustomParams.fractal_bloom_pen?.koch_depth);
      return Number.isFinite(kochDepth) ? Math.round(clamp(kochDepth, 1, 4)) : 4;
    }
    const depth = Number(app.penCustomParams.fractal_bloom_pen?.depth);
    return Number.isFinite(depth) ? Math.round(clamp(depth, 1, 8)) : 6;
  }

  getRevealPerFrame(): number {
    const speed = Number(app.penCustomParams.fractal_bloom_pen?.growth_speed);
    const speedMultiplier = Number.isFinite(speed) ? clamp(speed, 0.2, 2) : 0.65;
    const base = Math.max(3, 3.4 + app.penSize / 5.8);
    return Math.max(1, base * speedMultiplier);
  }

  getMode(): "tree" | "koch" | "fern" {
    const params = app.penCustomParams.fractal_bloom_pen;
    if (params?.mode === "koch" || params?.mode === "tree" || params?.mode === "fern") {
      return params.mode;
    }
    // Backward compatibility for older persisted key.
    const useKoch = params?.use_koch === true;
    return useKoch ? "koch" : "tree";
  }

  getFernOptions(): {
    fernStemTiltDeg: number;
    fernSpreadDeg: number;
    fernLeafScale: number;
    fernStemDecay: number;
    fernJitterDeg: number;
  } {
    const params = app.penCustomParams.fractal_bloom_pen;
    const stemTilt = Number(params?.fern_stem_tilt_deg);
    const spread = Number(params?.fern_spread_deg);
    const leafScale = Number(params?.fern_leaf_scale);
    const stemDecay = Number(params?.fern_stem_decay);
    const jitter = Number(params?.fern_jitter_deg);

    return {
      fernStemTiltDeg: Number.isFinite(stemTilt) ? clamp(stemTilt, -45, 45) : 4,
      fernSpreadDeg: Number.isFinite(spread) ? clamp(spread, 6, 85) : 24,
      fernLeafScale: Number.isFinite(leafScale) ? clamp(leafScale, 0.12, 0.9) : 0.36,
      fernStemDecay: Number.isFinite(stemDecay) ? clamp(stemDecay, 0.5, 0.95) : 0.74,
      fernJitterDeg: Number.isFinite(jitter) ? clamp(jitter, 0, 35) : 6,
    };
  }

  getTreeOptions(): {
    treeSpreadDeg: number;
  } {
    const params = app.penCustomParams.fractal_bloom_pen;
    const spread = Number(params?.tree_spread_deg);

    return {
      treeSpreadDeg: Number.isFinite(spread) ? clamp(spread, 4, 85) : 22,
    };
  }

}
