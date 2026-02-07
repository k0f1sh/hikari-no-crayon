import { app } from "../../core/state";
import { movePos } from "../../core/math";
import { drawLines } from "../../core/draw";
import type { Color, Effect, Point } from "../../types";
import { isOutOfBounds, tail } from "./utils";

export class BloodEffect implements Effect {
  pos: Point;
  spd: number;
  d: number;
  rotateCount: number;
  alpha: number;
  delFlg: boolean;
  color: Color;
  posHistory: Point[];
  decAlphaP: number;
  historyNum: number;

  constructor(x: number, y: number, color: Color) {
    this.pos = { x, y };
    this.spd = app.penSize / 10;
    this.d = 1 + Math.floor(Math.random() * 360);
    this.rotateCount = 2 + Math.floor(Math.random() * 5);
    this.alpha = 0.3;
    this.delFlg = false;
    this.color = color;
    this.posHistory = [];
    this.decAlphaP = 0.001;
    this.historyNum = 3;
  }

  move(): void {
    this.decAlphaP += 0.0004;
    this.alpha = Math.max(0, this.alpha - this.decAlphaP);

    this.posHistory.push(this.pos);
    this.posHistory = tail(this.posHistory, this.historyNum);

    if (Math.floor(Math.random() * 20) === 0) {
      const effect = new BloodEffect(this.pos.x, this.pos.y, app.penColor);
      effect.alpha = this.alpha;
      effect.d = this.d + (Math.floor(Math.random() * 120) - 60);
      app.effects.push(effect);
    }

    this.pos = movePos(this.pos, this.spd, this.d);
    this.rotateCount -= 1;

    if (this.rotateCount <= 0) {
      this.rotateCount = 2 + Math.floor(Math.random() * 2);
      this.d += Math.floor(Math.random() * 80) - 40;
    }

    if (isOutOfBounds(this.pos, this.alpha)) {
      this.delete();
    }
  }

  render(): void {
    drawLines(this.posHistory, this.color, this.alpha, this.alpha * 8);
  }

  delete(): void {
    this.delFlg = true;
  }
}
