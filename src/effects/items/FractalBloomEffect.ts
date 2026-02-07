import { app } from "../../core/state";
import { colorToString } from "../../core/color";
import { requireMainContext } from "../../core/state";
import { drawLineColor } from "../../core/draw";
import type { Color, Effect, Point } from "../../types";
import { isOutOfBounds } from "./utils";

export class FractalBloomEffect implements Effect {
  center: Point;
  pos: Point;
  prevPos: Point;
  alpha: number;
  delFlg: boolean;
  color: Color;
  age: number;
  maxAge: number;
  phase: number;
  phaseSpeed: number;
  orbitScale: number;
  driftX: number;
  driftY: number;
  branchChance: number;
  branchDepth: number;
  hasBranched: boolean;

  constructor(x: number, y: number, color: Color, branchDepth = 0) {
    this.center = { x, y };
    this.pos = { x, y };
    this.prevPos = { x, y };
    this.alpha = 0.3 - branchDepth * 0.08;
    this.delFlg = false;
    this.color = color;
    this.age = 0;
    this.maxAge = Math.max(28, Math.floor(app.penSize * (0.85 + Math.random() * 1.15)));
    this.phase = Math.random() * Math.PI * 2;
    this.phaseSpeed = 0.05 + Math.random() * 0.07;
    this.orbitScale = Math.max(6, app.penSize * (0.3 + Math.random() * 1.2));
    this.driftX = (Math.random() - 0.5) * 0.75;
    this.driftY = (Math.random() - 0.5) * 0.75;
    this.branchChance = 0.007 - branchDepth * 0.003;
    this.branchDepth = branchDepth;
    this.hasBranched = false;
  }

  move(): void {
    this.age += 1;
    this.phase += this.phaseSpeed;
    this.alpha *= 0.988;

    this.center.x += this.driftX * 0.22 + (Math.random() - 0.5) * 0.12;
    this.center.y += this.driftY * 0.22 + (Math.random() - 0.5) * 0.12;

    const fx = Math.sin(this.phase * 2.0) + Math.sin(this.phase * 3.2) * 0.55;
    const fy = Math.cos(this.phase * 2.8) + Math.cos(this.phase * 4.4) * 0.45;
    this.prevPos.x = this.pos.x;
    this.prevPos.y = this.pos.y;
    this.pos.x = this.center.x + fx * this.orbitScale;
    this.pos.y = this.center.y + fy * this.orbitScale;

    if (
      !this.hasBranched &&
      this.branchDepth < 1 &&
      this.alpha > 0.12 &&
      this.age > 10 &&
      Math.random() < Math.max(0, this.branchChance)
    ) {
      const child = new FractalBloomEffect(this.pos.x, this.pos.y, this.color, this.branchDepth + 1);
      child.orbitScale = this.orbitScale * (0.58 + Math.random() * 0.2);
      child.phase = this.phase + Math.random() * Math.PI;
      child.maxAge = Math.max(16, Math.floor(this.maxAge * (0.52 + Math.random() * 0.12)));
      child.alpha = this.alpha * 0.66;
      app.effects.push(child);
      this.hasBranched = true;
    }

    if (this.age > this.maxAge || isOutOfBounds(this.pos, this.alpha)) {
      this.delete();
    }
  }

  render(): void {
    const lifeRatio = 1 - this.age / this.maxAge;
    const trailAlpha = this.alpha * (0.3 + lifeRatio * 0.5);
    const glowAlpha = Math.min(0.28, this.alpha * 0.9);
    const lineWidth = Math.max(0.36, app.penSize / 66) * (1 + lifeRatio * 0.7);
    const core = Math.max(1.1, app.penSize / 20);
    const bloom = Math.max(8, app.penSize * 0.95) * (0.55 + lifeRatio * 0.6);

    drawLineColor(this.prevPos, this.pos, this.color, trailAlpha, lineWidth);
    this.drawGlow(this.pos.x, this.pos.y, core, glowAlpha * 0.7);
    this.drawGlow(this.pos.x, this.pos.y, bloom * 0.45, glowAlpha * 0.42);
    this.drawGlow(this.pos.x, this.pos.y, bloom, glowAlpha * 0.18);

    if (glowAlpha < 0.01) {
      this.delete();
    }
  }

  drawGlow(x: number, y: number, radius: number, alpha: number): void {
    const c = requireMainContext();
    const grad = c.createRadialGradient(x, y, 0, x, y, radius);
    grad.addColorStop(0, colorToString(this.color, alpha));
    grad.addColorStop(0.5, colorToString(this.color, alpha * 0.34));
    grad.addColorStop(1, "rgba(0, 0, 0, 0)");
    c.fillStyle = grad;
    c.beginPath();
    c.arc(x, y, radius, 0, Math.PI * 2, false);
    c.fill();
  }

  delete(): void {
    this.delFlg = true;
  }
}
