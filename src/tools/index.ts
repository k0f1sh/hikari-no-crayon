import { app } from "../core/state";
import { hsvToRgb } from "../core/color";
import { d2r, normalRand } from "../core/math";
import { drawCircle, drawDarkCircle, drawLineColor, drawPoint } from "../core/draw";
import { BloodEffect, CollatzEffect, DegiEffect, HaneEffect, HoshiEffect, NamiEffect, SnowEffect } from "../effects";
import type { PenTool, PenToolMap } from "../types";

class NormalPen implements PenTool {
  draw(x: number, y: number): void {
    drawCircle(x, y, app.penSize, app.penColor, 0.1, 1.0);
  }
}

class BloodPen implements PenTool {
  draw(x: number, y: number): void {
    app.effects.push(new BloodEffect(x, y, app.penColor));
  }
}

class FurPen implements PenTool {
  draw(x: number, y: number): void {
    for (let n = 0; n < 120; n += 1) {
      const ox = x + Math.floor(Math.random() * 20) - 10;
      const oy = y + Math.floor(Math.random() * 20) - 10;
      const toX = x + Math.cos(d2r(n * 3)) * app.penSize * Math.random();
      const toY = y + Math.sin(d2r(n * 3)) * app.penSize * Math.random();
      drawLineColor({ x: ox, y: oy }, { x: toX, y: toY }, app.penColor, 80, 0.1);
    }
  }
}

class SnowPen implements PenTool {
  draw(x: number, y: number): void {
    for (let n = 0; n < 10; n += 1) {
      const d = (app.count + n * 36) % 360;
      app.effects.push(new SnowEffect(x, y, app.penColor, d));
    }
  }
}

class CollatzPen implements PenTool {
  draw(x: number, y: number): void {
    app.effects.push(new CollatzEffect(x, y, app.penColor));
  }
}

class HoshiPen implements PenTool {
  draw(x: number, y: number): void {
    app.effects.push(new HoshiEffect(x, y, app.penColor));
  }
}

class HanePen implements PenTool {
  draw(x: number, y: number): void {
    app.effects.push(new HaneEffect(x, y, app.penColor));
  }
}

class YamiPen implements PenTool {
  draw(x: number, y: number): void {
    drawDarkCircle(x, y, app.penSize);
  }
}

class NamiPen implements PenTool {
  draw(x: number, y: number): void {
    app.effects.push(new NamiEffect(x, y));
  }
}

class SprayPen implements PenTool {
  draw(x: number, y: number): void {
    for (let n = 0; n < app.penSize * 20; n += 1) {
      const rx = normalRand(x, app.penSize / 2);
      const ry = normalRand(y, app.penSize / 2);
      drawPoint(rx, ry, app.penColor, 0.6);
    }
  }
}

class BubblePen implements PenTool {
  draw(x: number, y: number): void {
    for (let n = 0; n < app.penSize; n += 1) {
      const rx = normalRand(x, app.penSize / 2);
      const ry = normalRand(y, app.penSize / 2);
      drawCircle(rx, ry, Math.random() * (app.penSize / 10), app.penColor, 1, 0.1);
    }
  }
}

class DegiPen implements PenTool {
  draw(x: number, y: number): void {
    app.effects.push(new DegiEffect(x, y, app.penColor));
  }
}

export function createPenTools(): PenToolMap {
  return {
    normal_pen: new NormalPen(),
    blood_pen: new BloodPen(),
    fur_pen: new FurPen(),
    snow_pen: new SnowPen(),
    collatz_pen: new CollatzPen(),
    hoshi_pen: new HoshiPen(),
    hane_pen: new HanePen(),
    yami_pen: new YamiPen(),
    nami_pen: new NamiPen(),
    spray_pen: new SprayPen(),
    bubble_pen: new BubblePen(),
    degi_pen: new DegiPen(),
  };
}

export const defaultPenName = "normal_pen";
export const defaultPenColor = hsvToRgb(200, 200, 200);
