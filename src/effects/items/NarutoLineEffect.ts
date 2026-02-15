import { app } from "../../core/state";
import { naruto } from "../../core/math";
import { drawLineColor } from "../../core/draw";
import type { Color, Effect, Point } from "../../types";

export abstract class NarutoLineEffect implements Effect {
  pos: Point;
  color: Color;
  alpha: number;
  size: number;
  narutoList: Point[];
  delFlg: boolean;
  cursor: number;
  stepSize: number;

  protected constructor(
    x: number,
    y: number,
    color: Color,
    factor: number,
    options?: { direction?: 1 | -1; speed?: number; lineWidth?: number },
  ) {
    this.pos = { x, y };
    this.color = color;
    this.alpha = 0.4;
    const lineWidth = Number.isFinite(options?.lineWidth) ? Number(options?.lineWidth) : 1;
    this.size = Math.max(0.1, Math.min(10, lineWidth));
    const direction = options?.direction === -1 ? -1 : 1;
    const speed = Number.isFinite(options?.speed) ? Number(options?.speed) : 1;
    this.stepSize = Math.max(0.2, Math.min(4, speed));
    this.narutoList = naruto(app.penSize, factor * direction);
    this.delFlg = false;
    this.cursor = 0;
  }

  move(): void {
    this.cursor += this.stepSize;
    if (Math.floor(this.cursor) + 1 >= this.narutoList.length) {
      this.delete();
    }
  }

  render(): void {
    const index = Math.floor(this.cursor);
    if (index + 1 >= this.narutoList.length) {
      this.delete();
      return;
    }

    const pos1 = {
      x: this.pos.x + this.narutoList[index].x,
      y: this.pos.y + this.narutoList[index].y,
    };
    const pos2 = {
      x: this.pos.x + this.narutoList[index + 1].x,
      y: this.pos.y + this.narutoList[index + 1].y,
    };
    drawLineColor(pos1, pos2, this.color, this.alpha, this.size);
  }

  delete(): void {
    this.delFlg = true;
  }
}
