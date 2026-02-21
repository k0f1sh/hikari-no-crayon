import { app } from "../../core/state";
import { movePos } from "../../core/math";
import { drawTriangle } from "../../core/draw";
import type { Color, Effect, Point } from "../../types";
import { isOutOfBounds } from "./utils";

export class SnowEffect implements Effect {
  pos: Point;
  spd: number;
  d: number;
  alpha: number;
  delFlg: boolean;
  color: Color;

  constructor(x: number, y: number, color: Color, d: number) {
    this.pos = { x, y };
    this.spd = Math.max(0.18, app.penSize / 10);
    this.d = d;
    this.alpha = 0.2;
    this.delFlg = false;
    this.color = color;
  }

  move(): void {
    this.pos = movePos(this.pos, this.spd, this.d);
    this.spd += 0.2;
    this.alpha = Math.max(0, this.alpha - 0.01);

    if (isOutOfBounds(this.pos, this.alpha)) {
      this.delete();
    }
  }

  render(): void {
    const x = this.pos.x;
    const y = this.pos.y;
    const spread = Math.max(1.6, app.penSize * 0.55);
    const half = spread / 2;
    const pos1 = {
      x: Math.random() * spread - half + x,
      y: Math.random() * spread - half + y,
    };
    const pos2 = {
      x: Math.random() * spread - half + x,
      y: Math.random() * spread - half + y,
    };
    const pos3 = {
      x: Math.random() * spread - half + x,
      y: Math.random() * spread - half + y,
    };

    drawTriangle(pos1, pos2, pos3, this.color, this.alpha);
  }

  delete(): void {
    this.delFlg = true;
  }
}
