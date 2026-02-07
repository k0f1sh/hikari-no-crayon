import { app } from "../../core/state";
import { d2r, movePos } from "../../core/math";
import { colorToString } from "../../core/color";
import { drawLines } from "../../core/draw";
import { requireMainContext } from "../../core/state";
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
    this.alpha = 0.26;
    this.delFlg = false;
    this.color = color;
    this.life = 90 + Math.floor(Math.random() * 70);
    this.pulsePhase = Math.random() * Math.PI * 2;
    this.posHistory = [];
  }

  move(): void {
    this.life -= 1;
    this.alpha *= 0.989;
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
    const coreRadius = Math.max(1.2, (app.penSize / 7) * (0.45 + pulse * 0.4));
    const haloRadius = Math.max(7, app.penSize * (0.55 + pulse * 0.8));
    const trailAlpha = this.alpha * (0.24 + pulse * 0.36);
    const glowAlpha = Math.min(0.24, this.alpha * (0.5 + pulse * 0.5));

    drawLines(this.posHistory, this.color, trailAlpha, 0.9 + pulse * 1.4);
    this.drawGlow(this.pos.x, this.pos.y, coreRadius, glowAlpha * 0.9);
    this.drawGlow(this.pos.x, this.pos.y, haloRadius * 0.45, glowAlpha * 0.46);
    this.drawGlow(this.pos.x, this.pos.y, haloRadius, glowAlpha * 0.2);

    if (pulse > 0.86) {
      const dx = Math.cos(d2r(this.d + 90)) * coreRadius;
      const dy = Math.sin(d2r(this.d + 90)) * coreRadius;
      this.drawGlow(this.pos.x + dx, this.pos.y + dy, coreRadius * 0.85, glowAlpha * 0.34);
      this.drawGlow(this.pos.x - dx, this.pos.y - dy, coreRadius * 0.85, glowAlpha * 0.34);
    }

    if (glowAlpha < 0.01) {
      this.delete();
    }
  }

  drawGlow(x: number, y: number, radius: number, alpha: number): void {
    const c = requireMainContext();
    const grad = c.createRadialGradient(x, y, 0, x, y, radius);
    grad.addColorStop(0, colorToString(this.color, alpha));
    grad.addColorStop(0.55, colorToString(this.color, alpha * 0.35));
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
