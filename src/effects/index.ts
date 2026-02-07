import { app } from "../core/state";
import { collatz, d2r, movePos, naruto, sample } from "../core/math";
import { drawCircle, drawLineColor, drawLines, drawTriangle } from "../core/draw";
import type { Color, Effect, Point } from "../types";

function isOutOfBounds(pos: Point, alpha: number): boolean {
  return (
    pos.x < 0 - app.margin ||
    pos.y < 0 - app.margin ||
    pos.x > app.width + app.margin ||
    pos.y > app.height + app.margin ||
    alpha <= 0
  );
}

function tail<T>(items: T[], count: number): T[] {
  return items.length <= count ? items : items.slice(items.length - count);
}

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

export class SnowEffect implements Effect {
  pos: Point;
  spd: number;
  d: number;
  alpha: number;
  delFlg: boolean;
  color: Color;

  constructor(x: number, y: number, color: Color, d: number) {
    this.pos = { x, y };
    this.spd = app.penSize / 10;
    this.d = d;
    this.alpha = 0.2;
    this.delFlg = false;
    this.color = color;
  }

  move(): void {
    this.pos = movePos(this.pos, this.spd, this.d);
    this.spd += 0.2;
    this.alpha = Math.max(0, this.alpha - 0.01);

    if (isOutOfBounds(this.pos, this.alpha)) {
      this.delete();
    }
  }

  render(): void {
    const x = this.pos.x;
    const y = this.pos.y;
    const half = app.penSize / 2;
    const pos1 = {
      x: Math.floor(Math.random() * app.penSize) - half + x,
      y: Math.floor(Math.random() * app.penSize) - half + y,
    };
    const pos2 = {
      x: Math.floor(Math.random() * app.penSize) - half + x,
      y: Math.floor(Math.random() * app.penSize) - half + y,
    };
    const pos3 = {
      x: Math.floor(Math.random() * app.penSize) - half + x,
      y: Math.floor(Math.random() * app.penSize) - half + y,
    };

    drawTriangle(pos1, pos2, pos3, this.color, this.alpha);
  }

  delete(): void {
    this.delFlg = true;
  }
}

abstract class NarutoLineEffect implements Effect {
  pos: Point;
  color: Color;
  alpha: number;
  size: number;
  narutoList: Point[];
  delFlg: boolean;

  constructor(x: number, y: number, color: Color, factor: number) {
    this.pos = { x, y };
    this.color = color;
    this.alpha = 0.4;
    this.size = 1;
    this.narutoList = naruto(app.penSize, factor);
    this.delFlg = false;
  }

  move(): void {
    this.narutoList = this.narutoList.slice(1);
    if (this.narutoList.length <= 2) {
      this.delete();
    }
  }

  render(): void {
    const pos1 = {
      x: this.pos.x + this.narutoList[0].x,
      y: this.pos.y + this.narutoList[0].y,
    };
    const pos2 = {
      x: this.pos.x + this.narutoList[1].x,
      y: this.pos.y + this.narutoList[1].y,
    };
    drawLineColor(pos1, pos2, this.color, this.alpha, this.size);
  }

  delete(): void {
    this.delFlg = true;
  }
}

export class HoshiEffect extends NarutoLineEffect {
  constructor(x: number, y: number, color: Color) {
    super(x, y, color, 10);
  }
}

export class HaneEffect extends NarutoLineEffect {
  constructor(x: number, y: number, color: Color) {
    super(x, y, color, 100000);
  }
}

export class NamiEffect implements Effect {
  pos: Point;
  size: number;
  alpha: number;
  delFlg: boolean;
  c: number;
  od: number;

  constructor(x: number, y: number) {
    this.pos = { x, y };
    this.size = app.penSize;
    this.alpha = 0.6;
    this.delFlg = false;
    this.c = 0;
    this.od = app.count % 360;
  }

  move(): void {
    this.c += 1;
    this.alpha -= 0.01;
    const d = Math.sin(d2r((app.count % 60) * 6)) * 93 + this.od;
    this.pos = movePos(this.pos, app.penSize / 10, d);

    if (isOutOfBounds(this.pos, this.alpha) || this.c > 3600) {
      this.delete();
    }
  }

  render(): void {
    const d = Math.sin(d2r((app.count % 60) * 6)) * 93 + this.od;
    const pos1 = this.pos;
    const pos2 = movePos(this.pos, this.size / 2, (d + 180) % 360);
    const pos3 = movePos(this.pos, this.size, (d + 180) % 360 - Math.floor(Math.random() * 20));
    const pos4 = movePos(this.pos, this.size, (d + 180) % 360 + Math.floor(Math.random() * 20));

    drawLineColor(pos1, pos2, app.penColor, this.alpha, 0.2);
    drawLineColor(pos1, pos3, app.penColor, this.alpha, 0.2);
    drawLineColor(pos1, pos4, app.penColor, this.alpha, 0.2);
  }

  delete(): void {
    this.delFlg = true;
  }
}

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
