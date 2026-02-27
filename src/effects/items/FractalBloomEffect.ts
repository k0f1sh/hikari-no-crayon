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

interface TreeNode {
  start: Point;
  angle: number;
  length: number;
  level: number;
}

interface FractalBloomOptions {
  mode?: "tree" | "koch" | "fern";
  depth?: number;
  alpha?: number;
  lineWidth?: number;
  revealPerFrame?: number;
  treeSpreadDeg?: number;
  treeBranchDecay?: number;
  treeJitterDeg?: number;
  treeExtraBranchChance?: number;
  fernStemTiltDeg?: number;
  fernSpreadDeg?: number;
  fernLeafScale?: number;
  fernStemDecay?: number;
  fernJitterDeg?: number;
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
  mode: "tree" | "koch" | "fern";
  treeSpreadRad: number;
  treeBranchDecay: number;
  treeJitterRad: number;
  treeExtraBranchChance: number;
  fernStemTiltRad: number;
  fernSpreadRad: number;
  fernLeafScale: number;
  fernStemDecay: number;
  fernJitterRad: number;

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
    this.maxDepth = Math.max(1, Math.min(8, Math.floor(options.depth ?? 6)));
    this.lineWidth = Math.max(0.16, options.lineWidth ?? app.penSize / 22);
    this.head = { x: fromX, y: fromY };
    this.treeSpreadRad = (Math.PI / 180) * this.clamp(options.treeSpreadDeg ?? 22, 4, 85);
    this.treeBranchDecay = this.clamp(options.treeBranchDecay ?? 0.66, 0.4, 0.95);
    this.treeJitterRad = (Math.PI / 180) * this.clamp(options.treeJitterDeg ?? 8, 0, 45);
    this.treeExtraBranchChance = this.clamp(options.treeExtraBranchChance ?? 0.3, 0, 1);
    this.fernStemTiltRad = (Math.PI / 180) * this.clamp(options.fernStemTiltDeg ?? 4, -45, 45);
    this.fernSpreadRad = (Math.PI / 180) * this.clamp(options.fernSpreadDeg ?? 24, 6, 85);
    this.fernLeafScale = this.clamp(options.fernLeafScale ?? 0.36, 0.12, 0.9);
    this.fernStemDecay = this.clamp(options.fernStemDecay ?? 0.74, 0.5, 0.95);
    this.fernJitterRad = (Math.PI / 180) * this.clamp(options.fernJitterDeg ?? 6, 0, 35);

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
    } else if (this.mode === "fern") {
      const root = { x: toX, y: toY };
      const dx = toX - fromX;
      const dy = toY - fromY;
      const angle = Math.atan2(dy, dx);
      const length = Math.max(10, Math.min(146, Math.hypot(dx, dy) * 0.82 + app.penSize * 0.5));
      this.growFern(root, angle, length, 0, this.maxDepth, this.segments);
    } else {
      const root = { x: toX, y: toY };
      const dx = toX - fromX;
      const dy = toY - fromY;
      const angle = Math.atan2(dy, dx);
      const length = Math.max(8, Math.min(140, Math.hypot(dx, dy) * 0.78 + app.penSize * 0.52));
      this.growTreeBreadthFirst(root, angle, length, this.maxDepth, this.segments);
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
        : this.mode === "koch"
          ? 1 - (seg.level / (this.maxDepth + 1)) * 0.45
          : 1 - (seg.level / (this.maxDepth + 1)) * 0.52;
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

  growTreeBreadthFirst(
    root: Point,
    rootAngle: number,
    rootLength: number,
    maxLevel: number,
    out: KochSegment[],
  ): void {
    const queue: TreeNode[] = [{ start: root, angle: rootAngle, length: rootLength, level: 0 }];
    let cursor = 0;

    while (cursor < queue.length) {
      const node = queue[cursor];
      cursor += 1;

      const end: Point = {
        x: node.start.x + Math.cos(node.angle) * node.length,
        y: node.start.y + Math.sin(node.angle) * node.length,
      };
      out.push({ from: node.start, to: end, level: node.level });

      if (node.level >= maxLevel) {
        continue;
      }

      const nextLevel = node.level + 1;
      const nextLength = node.length * this.treeBranchDecay * (0.92 + Math.random() * 0.15);
      const spread = this.treeSpreadRad * (0.84 + node.level * 0.13)
        + (Math.random() - 0.5) * this.treeJitterRad * 0.5;
      const jitter = (Math.random() - 0.5) * this.treeJitterRad;

      queue.push(
        { start: end, angle: node.angle - spread + jitter, length: nextLength, level: nextLevel },
        { start: end, angle: node.angle + spread + jitter, length: nextLength, level: nextLevel },
      );

      if (node.level <= 1 && Math.random() < this.treeExtraBranchChance) {
        queue.push({
          start: end,
          angle: node.angle + jitter * 0.6,
          length: nextLength * 0.78,
          level: nextLevel,
        });
      }
    }
  }

  growFern(
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

    const levelTilt = this.fernStemTiltRad * (1 - level / (maxLevel + 1));
    const stemJitter = (Math.random() - 0.5) * this.fernJitterRad * 0.9;
    const nextStemLength = length * this.fernStemDecay * (0.95 + Math.random() * 0.08);
    const nextStemAngle = angle + levelTilt + stemJitter * 0.35;
    this.growFern(end, nextStemAngle, nextStemLength, level + 1, maxLevel, out);

    const branchPairs = level <= 1 ? 3 : 2;
    const baseSpread = this.fernSpreadRad * (0.72 + level * 0.1);
    for (let i = 1; i <= branchPairs; i += 1) {
      const t = i / (branchPairs + 1);
      const node: Point = {
        x: start.x + (end.x - start.x) * t,
        y: start.y + (end.y - start.y) * t,
      };

      const sideLength = length
        * this.fernLeafScale
        * (1 - level * 0.08)
        * (1 - t * 0.2);
      if (sideLength <= 1) {
        continue;
      }

      const spread = baseSpread * (0.82 + t * 0.35) + (Math.random() - 0.5) * this.fernJitterRad;
      const leftTip: Point = {
        x: node.x + Math.cos(angle - spread) * sideLength,
        y: node.y + Math.sin(angle - spread) * sideLength,
      };
      const rightTip: Point = {
        x: node.x + Math.cos(angle + spread) * sideLength,
        y: node.y + Math.sin(angle + spread) * sideLength,
      };
      out.push({ from: node, to: leftTip, level: level + 1 });
      out.push({ from: node, to: rightTip, level: level + 1 });

      if (level + 2 <= maxLevel) {
        const childLength = sideLength * this.fernStemDecay * (0.95 + Math.random() * 0.08);
        this.growFern(leftTip, angle - spread * 0.6, childLength, level + 2, maxLevel, out);
        this.growFern(rightTip, angle + spread * 0.6, childLength, level + 2, maxLevel, out);
      }
    }
  }

  clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  delete(): void {
    this.delFlg = true;
  }
}
