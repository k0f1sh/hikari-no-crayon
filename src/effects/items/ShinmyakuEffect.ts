import { app } from "../../core/state";
import { d2r, movePos } from "../../core/math";
import { drawCircle, drawLines } from "../../core/draw";
import type { Color, Effect, Point } from "../../types";
import { isOutOfBounds, tail } from "./utils";

export class ShinmyakuEffect implements Effect {
  pos: Point;
  d: number;
  spd: number;
  alpha: number;
  delFlg: boolean;
  color: Color;
  life: number;
  pulsePhase: number;
  posHistory: Point[];

  constructor(x: number, y: number, color: Color) {
    this.pos = { x, y };
    this.d = Math.floor(Math.random() * 360);
    this.spd = Math.max(1.2, app.penSize / 8);
    this.alpha = 0.34;
    this.delFlg = false;
    this.color = color;
    this.life = 90 + Math.floor(Math.random() * 70);
    this.pulsePhase = Math.random() * Math.PI * 2;
    this.posHistory = [];
  }

  move(): void {
    this.life -= 1;
    this.alpha *= 0.992;
    this.pulsePhase += 0.35;

    this.posHistory.push({ x: this.pos.x, y: this.pos.y });
    this.posHistory = tail(this.posHistory, 10);

    const wobble = Math.sin(this.pulsePhase) * 28;
    this.pos = movePos(this.pos, this.spd, this.d + wobble);

    if (this.life <= 0 || isOutOfBounds(this.pos, this.alpha)) {
      this.delete();
    }
  }

  render(): void {
    const pulse = (Math.sin(this.pulsePhase) + 1) / 2;
    const pulseRadius = Math.max(1.5, (app.penSize / 5) * (0.5 + pulse));
    const pulseAlpha = this.alpha * (0.35 + pulse * 0.65);

    drawLines(this.posHistory, this.color, this.alpha, 1.4 + pulse * 2.8);
    drawCircle(this.pos.x, this.pos.y, pulseRadius, this.color, 0.05, 1.0);
    drawCircle(this.pos.x, this.pos.y, pulseRadius * 2, this.color, 0.9, 1.0);

    if (pulse > 0.9) {
      const dx = Math.cos(d2r(this.d + 90)) * pulseRadius;
      const dy = Math.sin(d2r(this.d + 90)) * pulseRadius;
      drawCircle(this.pos.x + dx, this.pos.y + dy, pulseRadius * 0.7, this.color, 0.1, 1.0);
      drawCircle(this.pos.x - dx, this.pos.y - dy, pulseRadius * 0.7, this.color, 0.1, 1.0);
    }

    if (pulseAlpha < 0.01) {
      this.delete();
    }
  }

  delete(): void {
    this.delFlg = true;
  }
}
