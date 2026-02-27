import { normalRand } from "../../core/math";
import { drawCircle } from "../../core/draw";
import type { Color, Effect } from "../../types";

export class BubbleBurstEffect implements Effect {
  static readonly BURST_STEPS = 4;
  static readonly STEP_INTERVAL_FRAMES = 3;

  x: number;
  y: number;
  color: Color;
  scatter: number;
  maxRadius: number;
  totalCount: number;
  emittedCount: number;
  stepIndex: number;
  frameCounter: number;
  delFlg: boolean;

  constructor(x: number, y: number, color: Color, penSize: number) {
    const safePenSize = Math.max(1.1, penSize);
    this.x = x;
    this.y = y;
    this.color = { ...color };
    this.scatter = Math.max(0.8, safePenSize / 2);
    this.maxRadius = Math.max(0.9, safePenSize / 10);
    this.totalCount = Math.max(3, Math.ceil(safePenSize));
    this.emittedCount = 0;
    this.stepIndex = 0;
    this.frameCounter = 0;
    this.delFlg = false;
  }

  move(): void {
    this.frameCounter += 1;
    if (this.stepIndex >= BubbleBurstEffect.BURST_STEPS || this.emittedCount >= this.totalCount) {
      this.delete();
    }
  }

  render(): void {
    if (this.delFlg) {
      return;
    }

    const remaining = this.totalCount - this.emittedCount;
    const stepsRemaining = BubbleBurstEffect.BURST_STEPS - this.stepIndex;
    if (remaining <= 0 || stepsRemaining <= 0) {
      this.delete();
      return;
    }

    if (this.frameCounter % BubbleBurstEffect.STEP_INTERVAL_FRAMES !== 0) {
      return;
    }

    const emitCount = Math.max(1, Math.ceil(remaining / stepsRemaining));
    for (let i = 0; i < emitCount; i += 1) {
      const rx = normalRand(this.x, this.scatter);
      const ry = normalRand(this.y, this.scatter);
      const radius = Math.max(0.35, Math.random() * this.maxRadius);
      drawCircle(rx, ry, radius, this.color, 1, 0.1);
    }

    this.emittedCount += emitCount;
    this.stepIndex += 1;
  }

  delete(): void {
    this.delFlg = true;
  }
}
