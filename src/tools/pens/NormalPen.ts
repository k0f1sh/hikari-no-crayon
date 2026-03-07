import { colorToOpaqueString } from "../../core/color";
import { app, requireMainContext } from "../../core/state";
import { drawCircle } from "../../core/draw";
import type { PenTool, Point } from "../../types";

export class NormalPen implements PenTool {
  lastPoints = new Map<number | "default", Point>();
  maskCache = new Map<string, HTMLCanvasElement>();
  stampCache = new Map<string, HTMLCanvasElement>();

  private getPointerKey(): number | "default" {
    return typeof app.activePointerId === "number" ? app.activePointerId : "default";
  }

  clearPointerState(pointerId: number): void {
    this.lastPoints.delete(pointerId);
  }

  clearStrokeState(): void {
    this.lastPoints.clear();
  }

  private hash2(x: number, y: number, seed: number): number {
    const s = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453123;
    return s - Math.floor(s);
  }

  private getMaskKey(
    radius: number,
    grainRatio: number,
    stretchRatio: number,
    dirX: number,
    dirY: number,
    hasDirection: boolean,
    seedBucket: number,
  ): string {
    const angleStepDeg = radius >= 80 ? 10 : 5;
    const angleBucket = hasDirection
      ? ((Math.round(((Math.atan2(dirY, dirX) * 180) / Math.PI) / angleStepDeg)
        % Math.round(360 / angleStepDeg))
        + Math.round(360 / angleStepDeg))
        % Math.round(360 / angleStepDeg)
      : 999;
    return [
      Math.round(radius * 10),
      Math.round(grainRatio * 100),
      Math.round(stretchRatio * 100),
      angleStepDeg,
      angleBucket,
      seedBucket,
    ].join(":");
  }

  private trimCache(cache: Map<string, HTMLCanvasElement>, maxEntries: number): void {
    while (cache.size > maxEntries) {
      const firstKey = cache.keys().next().value;
      if (!firstKey) {
        break;
      }
      cache.delete(firstKey);
    }
  }

  private createCrayonMask(
    radius: number,
    grainRatio: number,
    stretchRatio: number,
    dirX: number,
    dirY: number,
    hasDirection: boolean,
    seedBucket: number,
  ): HTMLCanvasElement {
    const key = this.getMaskKey(radius, grainRatio, stretchRatio, dirX, dirY, hasDirection, seedBucket);
    const cached = this.maskCache.get(key);
    if (cached) {
      this.maskCache.delete(key);
      this.maskCache.set(key, cached);
      return cached;
    }

    const tailPadding = hasDirection ? Math.ceil(radius * stretchRatio * 0.28) : 0;
    const padding = Math.max(6, Math.ceil(radius * 0.6) + tailPadding);
    const size = Math.max(8, Math.ceil(radius * 2 + padding * 2));
    const center = size / 2;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const c = canvas.getContext("2d");
    if (!c) {
      return canvas;
    }

    const drawGlow = (cx: number, cy: number, r: number, alpha: number) => {
      const grad = c.createRadialGradient(cx, cy, 1, cx, cy, r);
      grad.addColorStop(0.1, `rgba(255,255,255,${alpha})`);
      grad.addColorStop(1, "rgba(0, 0, 0, 0)");
      c.fillStyle = grad;
      c.beginPath();
      c.arc(cx, cy, r, 0, Math.PI * 2, false);
      c.fill();
      c.closePath();
    };

    drawGlow(center, center, radius, 0.72);
    const sideX = -dirY;
    const sideY = dirX;

    if (hasDirection && stretchRatio > 0.01) {
      const smearCount = 1 + Math.round(stretchRatio * 2);
      const baseStep = radius * (0.04 + stretchRatio * 0.04);
      for (let i = 0; i < smearCount; i += 1) {
        const t = (i + 1) / smearCount;
        const backOffset = baseStep * (i + 1) * (0.9 + stretchRatio * 0.35);
        const smearRadius = radius * (0.96 - t * (0.08 + stretchRatio * 0.06));
        const alpha = (0.08 + stretchRatio * 0.1) * (1 - t * 0.65);
        const jitter = (this.hash2(i, seedBucket, 97) - 0.5) * radius * 0.05 * stretchRatio;
        drawGlow(
          center - dirX * backOffset + sideX * jitter,
          center - dirY * backOffset + sideY * jitter,
          Math.max(1, smearRadius),
          Math.max(0.04, alpha),
        );
      }
    }

    const image = c.getImageData(0, 0, size, size);
    const { data } = image;
    const grainCell = 1.3 + grainRatio * 2.4;
    const holeStrength = grainRatio * 0.5;
    const pixelStep = radius >= 110 ? 3 : radius >= 60 ? 2 : 1;
    const reduceStretchDetail = radius >= 70;
    const skipHeavyStretchPass = radius >= 110;

    for (let py = 0; py < size; py += pixelStep) {
      for (let px = 0; px < size; px += pixelStep) {
        const index = (py * size + px) * 4;
        const alpha = data[index + 3] / 255;
        if (alpha <= 0) {
          continue;
        }

        const localX = px + 0.5 - center;
        const localY = py + 0.5 - center;
        const normR = Math.hypot(localX, localY) / Math.max(1, radius);
        if (normR > 1.28) {
          continue;
        }

        const grainX = localX / grainCell;
        const grainY = localY / grainCell;
        const coarse = this.hash2(Math.floor(grainX), Math.floor(grainY), seedBucket + 11);
        const fine = this.hash2(Math.floor(grainX * 2.4), Math.floor(grainY * 2.4), seedBucket + 29);
        const speck = this.hash2(px, py, seedBucket + 47);

        let alphaMul = 0.86 + (coarse - 0.5) * (0.18 + grainRatio * 0.72);
        alphaMul += (fine - 0.5) * grainRatio * 0.42;

        if (speck < holeStrength * 0.34) {
          alphaMul *= 0.22 + coarse * 0.35;
        }

        if (hasDirection && stretchRatio > 0.01) {
          const along = (localX * dirX + localY * dirY) / Math.max(1, radius);
          const across = (localX * sideX + localY * sideY) / Math.max(1, radius);
          const stretchAlongFreqLow = reduceStretchDetail ? 2 + stretchRatio * 4 : 4 + stretchRatio * 8;
          const stretchAcrossFreqHigh = reduceStretchDetail
            ? 14 + stretchRatio * 20
            : 22 + stretchRatio * 34;
          const streak = this.hash2(
            Math.floor((along + 1.6) * stretchAlongFreqLow),
            Math.floor((across + 1.6) * stretchAcrossFreqHigh),
            seedBucket + 71,
          );
          const tail = Math.max(0, -along);
          const front = Math.max(0, along);
          const tailBand = this.hash2(
            Math.floor((along + 2.2) * (10 + stretchRatio * 16)),
            Math.floor((across + 2.2) * (4 + stretchRatio * 6)),
            seedBucket + 113,
          );
          const scratch = this.hash2(
            Math.floor((along + 1.8) * (reduceStretchDetail ? 2 + stretchRatio * 3 : 3 + stretchRatio * 5)),
            Math.floor((across + 1.8) * (reduceStretchDetail ? 16 + stretchRatio * 34 : 26 + stretchRatio * 64)),
            seedBucket + 151,
          );
          const scratch2 = skipHeavyStretchPass
            ? 0.5
            : this.hash2(
              Math.floor((along + 1.8) * (reduceStretchDetail ? 2 + stretchRatio * 3 : 2 + stretchRatio * 4)),
              Math.floor((across + 1.8) * (reduceStretchDetail ? 9 + stretchRatio * 18 : 14 + stretchRatio * 34)),
              seedBucket + 173,
            );

          alphaMul *= 0.88 + (streak - 0.5) * stretchRatio * 1.05;
          alphaMul *= 1 + tail * stretchRatio * 0.12;
          alphaMul *= 1 - front * stretchRatio * 0.06;

          const centerBand = Math.max(0, 1 - Math.abs(across) * (1.4 + stretchRatio * 1.2));
          const scratchBand = Math.max(0, 1 - Math.abs(across) * (0.9 + stretchRatio * 0.9));
          if (scratch < 0.28 + stretchRatio * 0.28) {
            alphaMul *= 1 - centerBand * (0.16 + stretchRatio * 0.4);
          }
          if (scratch > 0.84 - stretchRatio * 0.2) {
            alphaMul *= 1 + centerBand * (0.06 + stretchRatio * 0.2);
          }
          if (!skipHeavyStretchPass) {
            if (scratch2 < 0.2 + stretchRatio * 0.22) {
              alphaMul *= 1 - scratchBand * (0.18 + stretchRatio * 0.46);
            }
            if (scratch2 > 0.88 - stretchRatio * 0.14) {
              alphaMul *= 1 + scratchBand * (0.08 + stretchRatio * 0.18);
            }
          }

          if (tail > 0.08) {
            alphaMul *= 0.96 + tailBand * (0.08 + stretchRatio * 0.16);
          }
        }

        if (hasDirection && stretchRatio > 0.01 && !skipHeavyStretchPass) {
          const along = (localX * dirX + localY * dirY) / Math.max(1, radius);
          const across = (localX * sideX + localY * sideY) / Math.max(1, radius);
          const ribFreq = reduceStretchDetail ? 7 + stretchRatio * 18 : 10 + stretchRatio * 30;
          const rib = Math.sin((across * ribFreq + along * 0.35) * Math.PI);
          const ribBand = Math.max(0, 1 - Math.abs(across) * (1.2 + stretchRatio * 1.1));
          alphaMul *= 1 + rib * ribBand * stretchRatio * 0.22;
        }

        if (normR > 0.74) {
          alphaMul *= 0.94 + (1 - normR) * 0.18;
        }

        for (let oy = 0; oy < pixelStep; oy += 1) {
          const yy = py + oy;
          if (yy >= size) {
            break;
          }
          for (let ox = 0; ox < pixelStep; ox += 1) {
            const xx = px + ox;
            if (xx >= size) {
              break;
            }
            const blockIndex = (yy * size + xx) * 4;
            if (data[blockIndex + 3] === 0) {
              continue;
            }
            const nextAlpha = Math.max(0, Math.min(255, Math.round(data[blockIndex + 3] * alphaMul)));
            data[blockIndex + 3] = nextAlpha;
          }
        }
      }
    }

    c.putImageData(image, 0, 0);
    this.maskCache.set(key, canvas);
    this.trimCache(this.maskCache, 48);
    return canvas;
  }

  private createColoredStamp(mask: HTMLCanvasElement, maskKey: string): HTMLCanvasElement {
    const colorKey = `${maskKey}:${colorToOpaqueString(app.penColor)}`;
    const cached = this.stampCache.get(colorKey);
    if (cached) {
      this.stampCache.delete(colorKey);
      this.stampCache.set(colorKey, cached);
      return cached;
    }

    const canvas = document.createElement("canvas");
    canvas.width = mask.width;
    canvas.height = mask.height;
    const c = canvas.getContext("2d");
    if (!c) {
      return canvas;
    }

    c.drawImage(mask, 0, 0);
    c.globalCompositeOperation = "source-in";
    c.fillStyle = colorToOpaqueString(app.penColor);
    c.fillRect(0, 0, canvas.width, canvas.height);
    c.globalCompositeOperation = "source-over";

    this.stampCache.set(colorKey, canvas);
    this.trimCache(this.stampCache, 96);
    return canvas;
  }

  draw(x: number, y: number): void {
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return;
    }

    const params = app.penCustomParams.normal_pen;
    if (params?.use_crayon_texture === false) {
      drawCircle(x, y, app.penSize, app.penColor, 0.1, 1.0);
      this.lastPoints.set(this.getPointerKey(), { x, y });
      return;
    }

    const grain = Math.max(0, Number(params?.crayon_grain ?? 36));
    const stretch = Math.max(0, Number(params?.crayon_stretch ?? 42));
    if (grain <= 0 && stretch <= 0) {
      drawCircle(x, y, app.penSize, app.penColor, 0.1, 1.0);
      this.lastPoints.set(this.getPointerKey(), { x, y });
      return;
    }

    const pointerKey = this.getPointerKey();
    const current: Point = { x, y };
    const previous = this.lastPoints.get(pointerKey) ?? null;

    let dirX = 0;
    let dirY = 0;
    let hasDirection = false;

    if (previous) {
      const dx = x - previous.x;
      const dy = y - previous.y;
      const distSq = dx * dx + dy * dy;
      const jumpThreshold = Math.max(28, app.penSize * 10);
      if (distSq > 0.000001 && distSq < jumpThreshold * jumpThreshold) {
        const dist = Math.sqrt(distSq);
        dirX = dx / dist;
        dirY = dy / dist;
        hasDirection = true;
      }
    }

    const grainRatio = Math.min(1, grain / 100);
    const stretchRatio = Math.min(1, stretch / 100);
    const seedCell = Math.max(24, app.penSize * 0.85);
    const seedBucket = ((Math.floor(x / seedCell) + Math.floor(y / seedCell)) % 4 + 4) % 4;
    const maskKey = this.getMaskKey(
      app.penSize,
      grainRatio,
      stretchRatio,
      dirX,
      dirY,
      hasDirection,
      seedBucket,
    );
    const mask = this.createCrayonMask(
      app.penSize,
      grainRatio,
      stretchRatio,
      dirX,
      dirY,
      hasDirection,
      seedBucket,
    );
    const stamp = this.createColoredStamp(mask, maskKey);
    const c = requireMainContext();
    c.drawImage(stamp, x - stamp.width / 2, y - stamp.height / 2);

    this.lastPoints.set(pointerKey, current);
  }
}
