import { app } from "../../core/state";
import { colorToString } from "../../core/color";
import { requireMainContext } from "../../core/state";
import { drawLineColor } from "../../core/draw";
import type { Color, Effect, Point } from "../../types";

interface KochSegment {
  from: Point;
  to: Point;
  level: number;
}

interface FractalBloomOptions {
  mode?: "tree" | "koch";
  depth?: number;
  alpha?: number;
  lineWidth?: number;
  revealPerFrame?: number;
}

export class FractalBloomEffect implements Effect {
  segments: KochSegment[];
  renderedCount: number;
  revealCursor: number;
  revealPerFrame: number;
  alpha: number;
  delFlg: boolean;
  color: Color;
  age: number;
  maxAge: number;
  maxDepth: number;
  lineWidth: number;
  head: Point;
  mode: "tree" | "koch";

  constructor(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    color: Color,
    options: FractalBloomOptions = {},
  ) {
    this.segments = [];
    this.renderedCount = 0;
    this.revealCursor = 0;
    this.revealPerFrame = Math.max(3, options.revealPerFrame ?? 4 + app.penSize / 5);
    this.alpha = Math.max(0.08, options.alpha ?? 0.26);
    this.delFlg = false;
    this.color = color;
    this.age = 0;
    this.mode = options.mode ?? "tree";
    this.maxDepth = Math.max(1, Math.min(5, Math.floor(options.depth ?? 3)));
    this.lineWidth = Math.max(0.16, options.lineWidth ?? app.penSize / 22);
    this.head = { x: fromX, y: fromY };

    if (this.mode === "koch") {
      const turnSign = Math.random() < 0.5 ? -1 : 1;
      this.subdivideKoch(
        { x: fromX, y: fromY },
        { x: toX, y: toY },
        0,
        this.maxDepth,
        turnSign,
        this.segments,
      );
    } else {
      const root = { x: toX, y: toY };
      const dx = toX - fromX;
      const dy = toY - fromY;
      const angle = Math.atan2(dy, dx);
      const length = Math.max(8, Math.min(140, Math.hypot(dx, dy) * 0.78 + app.penSize * 0.52));
      this.growTree(root, angle, length, 0, this.maxDepth, this.segments);
    }

    this.maxAge = Math.max(24, Math.ceil(this.segments.length / this.revealPerFrame) + 20);
  }

  move(): void {
    this.age += 1;
    if (this.renderedCount < this.segments.length) {
      this.revealCursor += this.revealPerFrame;
    } else {
      this.alpha *= 0.95;
    }

    if (this.age > this.maxAge || this.alpha < 0.01) {
      this.delete();
    }
  }

  render(): void {
    const target = Math.min(this.segments.length, Math.floor(this.revealCursor));
    for (let i = this.renderedCount; i < target; i += 1) {
      const seg = this.segments[i];
      const depthScale = this.mode === "tree"
        ? 1 - (seg.level / (this.maxDepth + 1)) * 0.6
        : 1 - (seg.level / (this.maxDepth + 1)) * 0.45;
      drawLineColor(seg.from, seg.to, this.color, this.alpha * depthScale, this.lineWidth * depthScale);
      this.head = seg.to;
    }
    this.renderedCount = target;

    if (this.renderedCount > 0 && this.mode !== "tree") {
      this.drawHeadGlow(this.head.x, this.head.y, Math.max(1.4, this.lineWidth * 1.8), this.alpha * 0.2);
    }
  }

  drawHeadGlow(x: number, y: number, radius: number, alpha: number): void {
    const c = requireMainContext();
    const grad = c.createRadialGradient(x, y, 0, x, y, radius);
    grad.addColorStop(0, colorToString(this.color, alpha));
    grad.addColorStop(0.5, colorToString(this.color, alpha * 0.35));
    grad.addColorStop(1, "rgba(0, 0, 0, 0)");
    c.fillStyle = grad;
    c.beginPath();
    c.arc(x, y, radius, 0, Math.PI * 2, false);
    c.fill();
  }

  subdivideKoch(
    a: Point,
    b: Point,
    level: number,
    maxLevel: number,
    turnSign: number,
    out: KochSegment[],
  ): void {
    if (level >= maxLevel) {
      out.push({ from: a, to: b, level });
      return;
    }

    const dx = (b.x - a.x) / 3;
    const dy = (b.y - a.y) / 3;
    const p1: Point = { x: a.x + dx, y: a.y + dy };
    const p3: Point = { x: a.x + dx * 2, y: a.y + dy * 2 };
    const cos = Math.cos((Math.PI / 3) * turnSign);
    const sin = Math.sin((Math.PI / 3) * turnSign);
    const rx = dx * cos - dy * sin;
    const ry = dx * sin + dy * cos;
    const peak: Point = { x: p1.x + rx, y: p1.y + ry };

    this.subdivideKoch(a, p1, level + 1, maxLevel, turnSign, out);
    this.subdivideKoch(p1, peak, level + 1, maxLevel, turnSign, out);
    this.subdivideKoch(peak, p3, level + 1, maxLevel, turnSign, out);
    this.subdivideKoch(p3, b, level + 1, maxLevel, turnSign, out);
  }

  growTree(
    start: Point,
    angle: number,
    length: number,
    level: number,
    maxLevel: number,
    out: KochSegment[],
  ): void {
    const end: Point = {
      x: start.x + Math.cos(angle) * length,
      y: start.y + Math.sin(angle) * length,
    };
    out.push({ from: start, to: end, level });

    if (level >= maxLevel) {
      return;
    }

    const nextLength = length * (0.66 + (Math.random() - 0.5) * 0.1);
    const spread = 0.35 + level * 0.03 + Math.random() * 0.18;
    const jitter = (Math.random() - 0.5) * 0.14;

    this.growTree(end, angle - spread + jitter, nextLength, level + 1, maxLevel, out);
    this.growTree(end, angle + spread + jitter, nextLength, level + 1, maxLevel, out);

    if (level <= 1 && Math.random() < 0.3) {
      this.growTree(end, angle + jitter * 0.6, nextLength * 0.78, level + 1, maxLevel, out);
    }
  }

  delete(): void {
    this.delFlg = true;
  }
}
