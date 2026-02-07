import { app } from "../../core/state";
import { movePos, sample } from "../../core/math";
import { drawLines } from "../../core/draw";
import type { Color, Effect, Point } from "../../types";
import { isOutOfBounds, tail } from "./utils";

export class DegiEffect implements Effect {
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
    this.d = sample([0, 90, 180, 270]);
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
      const effect = new DegiEffect(this.pos.x, this.pos.y, app.penColor);
      effect.alpha = this.alpha;
      effect.d = sample([0, 90, 180, 270]);
      app.effects.push(effect);
    }

    this.pos = movePos(this.pos, this.spd, this.d);
    this.rotateCount -= 1;

    if (this.rotateCount <= 0) {
      this.rotateCount = 2 + Math.floor(Math.random() * 2);
      this.d += sample([0, 90, 180, 270]);
    }

    if (isOutOfBounds(this.pos, this.alpha)) {
      this.delete();
    }
  }

  render(): void {
    drawLines(this.posHistory, this.color, this.alpha, 1);
  }

  delete(): void {
    this.delFlg = true;
  }
}
