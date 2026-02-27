import { app } from "../../core/state";
import { SnowEffect } from "../../effects";
import type { PenTool } from "../../types";

export class SnowPen implements PenTool {
  angularDistance(a: number, b: number): number {
    const raw = Math.abs(a - b) % 360;
    return Math.min(raw, 360 - raw);
  }

  createSparseSpokes(count: number): number[] {
    const spokeCount = Math.max(3, Math.min(6, Math.round(count * 0.5)));
    const minGap = 360 / (spokeCount + 1);
    const spokes: number[] = [];
    let attempts = 0;

    while (spokes.length < spokeCount && attempts < 240) {
      attempts += 1;
      const candidate = Math.random() * 360;
      const hasGap = spokes.every((angle) => this.angularDistance(angle, candidate) >= minGap * 0.78);
      if (hasGap) {
        spokes.push(candidate);
      }
    }

    while (spokes.length < spokeCount) {
      spokes.push(Math.random() * 360);
    }

    return spokes;
  }

  draw(x: number, y: number): void {
    const effectCount = 10;
    const spokes = this.createSparseSpokes(effectCount);
    for (let n = 0; n < effectCount; n += 1) {
      const base = spokes[Math.floor(Math.random() * spokes.length)];
      const jitter = (Math.random() - 0.5) * 22;
      const d = (base + jitter + 360) % 360;
      app.effects.push(new SnowEffect(x, y, app.penColor, d));
    }
  }
}
