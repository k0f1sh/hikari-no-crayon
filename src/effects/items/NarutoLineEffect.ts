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

  protected constructor(x: number, y: number, color: Color, factor: number) {
    this.pos = { x, y };
    this.color = color;
    this.alpha = 0.4;
    this.size = 1;
    this.narutoList = naruto(app.penSize, factor);
    this.delFlg = false;
  }

  move(): void {
    this.narutoList = this.narutoList.slice(1);
    if (this.narutoList.length <= 2) {
      this.delete();
    }
  }

  render(): void {
    const pos1 = {
      x: this.pos.x + this.narutoList[0].x,
      y: this.pos.y + this.narutoList[0].y,
    };
    const pos2 = {
      x: this.pos.x + this.narutoList[1].x,
      y: this.pos.y + this.narutoList[1].y,
    };
    drawLineColor(pos1, pos2, this.color, this.alpha, this.size);
  }

  delete(): void {
    this.delFlg = true;
  }
}
