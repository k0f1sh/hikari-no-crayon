import { app } from "../../core/state";
import { collatz, d2r } from "../../core/math";
import { drawCircle } from "../../core/draw";
import type { Color, Effect, Point } from "../../types";

export class CollatzEffect implements Effect {
  pos: Point;
  color: Color;
  alpha: number;
  collatzList: number[];
  delFlg: boolean;
  n: number;

  constructor(x: number, y: number, color: Color) {
    this.pos = { x, y };
    this.color = color;
    this.alpha = 0.5;
    this.collatzList = collatz(app.penSize);
    this.delFlg = false;
    this.n = 0;
  }

  move(): void {
    this.n = this.collatzList[0];
    this.collatzList = this.collatzList.slice(1);

    if (this.collatzList.length === 1) {
      this.delete();
      return;
    }

    const moveSize = this.n / 2;
    const d = Math.floor(Math.random() * 360);

    this.pos = {
      x: this.pos.x + Math.cos(d2r(d)) * moveSize,
      y: this.pos.y + Math.sin(d2r(d)) * moveSize,
    };
  }

  render(): void {
    drawCircle(this.pos.x, this.pos.y, this.n, this.color, this.alpha, 0.8);
  }

  delete(): void {
    this.delFlg = true;
  }
}
