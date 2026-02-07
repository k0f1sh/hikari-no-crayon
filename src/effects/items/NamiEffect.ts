import { app } from "../../core/state";
import { d2r, movePos } from "../../core/math";
import { drawLineColor } from "../../core/draw";
import type { Effect, Point } from "../../types";
import { isOutOfBounds } from "./utils";

export class NamiEffect implements Effect {
  pos: Point;
  size: number;
  alpha: number;
  delFlg: boolean;
  c: number;
  od: number;

  constructor(x: number, y: number) {
    this.pos = { x, y };
    this.size = app.penSize;
    this.alpha = 0.6;
    this.delFlg = false;
    this.c = 0;
    this.od = app.count % 360;
  }

  move(): void {
    this.c += 1;
    this.alpha -= 0.01;
    const d = Math.sin(d2r((app.count % 60) * 6)) * 93 + this.od;
    this.pos = movePos(this.pos, app.penSize / 10, d);

    if (isOutOfBounds(this.pos, this.alpha) || this.c > 3600) {
      this.delete();
    }
  }

  render(): void {
    const d = Math.sin(d2r((app.count % 60) * 6)) * 93 + this.od;
    const pos1 = this.pos;
    const pos2 = movePos(this.pos, this.size / 2, (d + 180) % 360);
    const pos3 = movePos(this.pos, this.size, (d + 180) % 360 - Math.floor(Math.random() * 20));
    const pos4 = movePos(this.pos, this.size, (d + 180) % 360 + Math.floor(Math.random() * 20));

    drawLineColor(pos1, pos2, app.penColor, this.alpha, 0.2);
    drawLineColor(pos1, pos3, app.penColor, this.alpha, 0.2);
    drawLineColor(pos1, pos4, app.penColor, this.alpha, 0.2);
  }

  delete(): void {
    this.delFlg = true;
  }
}
