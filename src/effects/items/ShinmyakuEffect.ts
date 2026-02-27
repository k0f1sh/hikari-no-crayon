import { app } from "../../core/state";
import { d2r, movePos } from "../../core/math";
import { colorToString } from "../../core/color";
import { drawLines } from "../../core/draw";
import { requireMainContext } from "../../core/state";
import type { Color, Effect, Point } from "../../types";
import { isOutOfBounds, tail } from "./utils";

export class ShinmyakuEffect implements Effect {
  pos: Point;
  origin: Point;
  d: number;
  spd: number;
  alpha: number;
  delFlg: boolean;
  color: Color;
  life: number;
  age: number;
  pulsePhase: number;
  posHistory: Point[];
  effectSize: number;
  smallBloomBoost: number;
  flowSeedA: number;
  flowSeedB: number;
  swirlSign: number;

  constructor(x: number, y: number, color: Color) {
    this.pos = { x, y };
    this.origin = { x, y };
    this.d = Math.floor(Math.random() * 360);
    this.smallBloomBoost = Math.max(0, Math.min(1, (22 - app.penSize) / 22));
    this.effectSize = Math.max(3.8, app.penSize * (0.38 + this.smallBloomBoost * 0.12));
    this.spd = Math.max(0.85, this.effectSize / 9);
    this.alpha = 0.26 + this.smallBloomBoost * 0.06;
    this.delFlg = false;
    this.color = color;
    this.life = 60 + Math.floor(Math.random() * 55);
    this.age = 0;
    this.pulsePhase = Math.random() * Math.PI * 2;
    this.posHistory = [];
    this.flowSeedA = Math.random() * Math.PI * 2;
    this.flowSeedB = Math.random() * Math.PI * 2;
    this.swirlSign = Math.random() < 0.5 ? -1 : 1;
  }

  move(): void {
    this.age += 1;
    this.life -= 1;
    this.alpha *= 0.989;
    this.pulsePhase += 0.28;

    this.posHistory.push({ x: this.pos.x, y: this.pos.y });
    this.posHistory = tail(this.posHistory, 10);

    const desiredDirection = this.sampleFlowDirection();
    this.d = this.rotateToward(this.d, desiredDirection, 8.5);

    const wobble = Math.sin(this.pulsePhase + this.flowSeedB) * 7;
    this.pos = movePos(this.pos, this.spd, this.d + wobble);

    if (this.life <= 0 || isOutOfBounds(this.pos, this.alpha)) {
      this.delete();
    }
  }

  render(): void {
    const pulse = (Math.sin(this.pulsePhase) + 1) / 2;
    const bloomScale = 1 + this.smallBloomBoost * 0.55;
    const coreRadius = Math.max(
      1 + this.smallBloomBoost * 0.7,
      (this.effectSize / 6.5) * (0.5 + pulse * 0.45) * bloomScale,
    );
    const haloRadius = Math.max(
      4.2 + this.smallBloomBoost * 3.6,
      this.effectSize * (0.42 + pulse * 0.48) * bloomScale,
    );
    const trailAlpha = this.alpha * (0.24 + pulse * 0.36);
    const glowAlpha = Math.min(0.3, this.alpha * (0.5 + pulse * 0.5) + this.smallBloomBoost * 0.05);
    const innerHaloAlpha = glowAlpha * (0.46 + this.smallBloomBoost * 0.16);
    const outerHaloAlpha = glowAlpha * (0.2 + this.smallBloomBoost * 0.14);

    drawLines(this.posHistory, this.color, trailAlpha, 0.65 + pulse * 0.9 + this.smallBloomBoost * 0.35);
    this.drawGlow(this.pos.x, this.pos.y, coreRadius, glowAlpha * 0.9);
    this.drawGlow(this.pos.x, this.pos.y, haloRadius * 0.45, innerHaloAlpha);
    this.drawGlow(this.pos.x, this.pos.y, haloRadius, outerHaloAlpha);

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

  sampleFlowDirection(): number {
    const x = this.pos.x * 0.009;
    const y = this.pos.y * 0.009;
    const t = app.count * 0.014 + this.flowSeedA;

    const flowX = Math.sin(y + t) + Math.sin((x + y) * 0.72 - t * 0.6 + this.flowSeedB) * 0.7;
    const flowY = Math.cos(x - t * 0.78) + Math.cos((x - y) * 0.64 + t * 0.5 - this.flowSeedB) * 0.7;
    const flowAngle = Math.atan2(flowY, flowX) * (180 / Math.PI);

    const ox = this.pos.x - this.origin.x;
    const oy = this.pos.y - this.origin.y;
    const distanceFromOrigin = Math.hypot(ox, oy);
    const radialAngle = Math.atan2(oy, ox) * (180 / Math.PI);
    const vesselAngle = radialAngle + this.swirlSign * 52;
    const vesselBias = Math.min(0.45, distanceFromOrigin / (this.effectSize * 20 + 60));

    return this.mixAngles(flowAngle, vesselAngle, vesselBias);
  }

  rotateToward(current: number, target: number, maxDelta: number): number {
    const delta = this.shortestAngleDelta(current, target);
    const clamped = Math.max(-maxDelta, Math.min(maxDelta, delta));
    return this.normalizeAngle(current + clamped);
  }

  shortestAngleDelta(from: number, to: number): number {
    let delta = this.normalizeAngle(to) - this.normalizeAngle(from);
    while (delta > 180) {
      delta -= 360;
    }
    while (delta < -180) {
      delta += 360;
    }
    return delta;
  }

  normalizeAngle(value: number): number {
    let angle = value % 360;
    if (angle < 0) {
      angle += 360;
    }
    return angle;
  }

  mixAngles(a: number, b: number, t: number): number {
    const safeT = Math.max(0, Math.min(1, t));
    const delta = this.shortestAngleDelta(a, b);
    return this.normalizeAngle(a + delta * safeT);
  }
}
