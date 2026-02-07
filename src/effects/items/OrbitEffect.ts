import { app } from "../../core/state";
import { drawCircle, drawLines, drawPoint } from "../../core/draw";
import type { Color, Effect, Point } from "../../types";
import { isOutOfBounds, tail } from "./utils";

export class OrbitEffect implements Effect {
  center: Point;
  pos: Point;
  posHistory: Point[];
  alpha: number;
  delFlg: boolean;
  color: Color;
  radius: number;
  baseRadius: number;
  radiusWave: number;
  angle: number;
  angleVelocity: number;
  centerDriftX: number;
  centerDriftY: number;
  age: number;
  maxAge: number;

  constructor(x: number, y: number, color: Color) {
    this.center = { x, y };
    this.pos = { x, y };
    this.posHistory = [];
    this.alpha = 0.32;
    this.delFlg = false;
    this.color = color;
    this.baseRadius = Math.max(8, app.penSize * (0.45 + Math.random() * 0.85));
    this.radius = this.baseRadius;
    this.radiusWave = 0.12 + Math.random() * 0.24;
    this.angle = Math.random() * Math.PI * 2;
    this.angleVelocity = 0.07 + Math.random() * 0.22;
    this.centerDriftX = (Math.random() - 0.5) * 0.34;
    this.centerDriftY = (Math.random() - 0.5) * 0.34;
    this.age = 0;
    this.maxAge = Math.max(42, Math.min(150, Math.floor(app.penSize * (1.1 + Math.random() * 0.7))));
  }

  move(): void {
    this.age += 1;
    this.alpha = Math.max(0, this.alpha - 0.0046);
    this.angle += this.angleVelocity;
    this.radius = this.baseRadius * (0.9 + 0.16 * Math.sin(this.age * this.radiusWave));
    this.center.x += this.centerDriftX + (Math.random() - 0.5) * 0.12;
    this.center.y += this.centerDriftY + (Math.random() - 0.5) * 0.12;
    this.pos.x = this.center.x + Math.cos(this.angle) * this.radius;
    this.pos.y = this.center.y + Math.sin(this.angle) * this.radius;
    this.posHistory.push({ x: this.pos.x, y: this.pos.y });
    this.posHistory = tail(this.posHistory, 18);

    if (Math.floor(Math.random() * 40) === 0 && this.alpha > 0.12) {
      const child = new OrbitEffect(this.pos.x, this.pos.y, this.color);
      child.alpha = this.alpha * 0.52;
      child.baseRadius = this.baseRadius * (0.3 + Math.random() * 0.28);
      child.radius = child.baseRadius;
      child.centerDriftX *= 0.45;
      child.centerDriftY *= 0.45;
      child.maxAge = Math.max(18, Math.floor(this.maxAge * 0.38));
      app.effects.push(child);
    }

    if (this.age > this.maxAge || isOutOfBounds(this.pos, this.alpha)) {
      this.delete();
    }
  }

  render(): void {
    if (this.posHistory.length >= 2) {
      drawLines(this.posHistory, this.color, this.alpha * 0.64, Math.max(0.35, app.penSize / 56));
    }
    drawPoint(this.pos.x, this.pos.y, this.color, Math.min(0.72, this.alpha));
    drawCircle(this.pos.x, this.pos.y, Math.max(1.2, app.penSize / 24), this.color, 0.2, 1.0);
  }

  delete(): void {
    this.delFlg = true;
  }
}
