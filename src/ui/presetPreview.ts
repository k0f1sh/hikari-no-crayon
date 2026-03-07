import { app } from "../core/state";
import { hexToRgb, hsvToRgb, colorToString } from "../core/color";
import { getDrawCompositeOperation } from "../core/draw";
import { stepEffectsInPlace } from "../core/effects";
import { forEachSymmetryPoint } from "../core/symmetry";
import { sampleSvgPathPoints, fitPointsToCanvas } from "../core/svgPathTrace";
import type { Color, Effect, Point, PenTool } from "../types";

export type SimplePresetConfig = {
  pen: string;
  size: number;
  colorHex: string;
  rainbowMode: boolean;
  rainbowSaturation: number;
  rainbowBrightness: number;
  fadeMode: boolean;
  autoMode: boolean;
  yamiMode: boolean;
  yamiStrength: number;
  symmetryMode: boolean;
  symmetryHud: boolean;
  symmetryType: "rotate" | "mirror";
  symmetryCount: number;
  symmetryOriginX: number;
  symmetryOriginY: number;
  lifeSnapToGrid?: boolean;
  normalUseCrayonTexture?: boolean;
};

interface PreviewState {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  config: PreparedPreviewConfig;
  effects: Effect[];
  count: number;
  pathPoints: Point[] | null;
  pathIndex: number;
}

type PreparedPreviewConfig = {
  source: SimplePresetConfig;
  penTool: PenTool | null;
  penColor: Color;
  centerX: number;
  centerY: number;
  margin: number;
};

type AppSnapshot = {
  canvas: HTMLCanvasElement | null;
  c: CanvasRenderingContext2D | null;
  width: number;
  height: number;
  penSize: number;
  penColor: Color;
  penTool: PenTool | null;
  selectedPenName: string;
  effects: Effect[];
  count: number;
  isRainbowMode: boolean;
  rainbowSaturation: number;
  rainbowBrightness: number;
  isFadeMode: boolean;
  isAutoMode: boolean;
  isYamiMode: boolean;
  yamiStrength: number;
  isSymmetryMode: boolean;
  symmetryType: "rotate" | "mirror";
  symmetryCount: number;
  symmetryOriginX: number;
  symmetryOriginY: number;
  margin: number;
  penCustomParams: typeof app.penCustomParams;
};

function saveAppState(): AppSnapshot {
  return {
    canvas: app.canvas,
    c: app.c,
    width: app.width,
    height: app.height,
    penSize: app.penSize,
    penColor: app.penColor,
    penTool: app.penTool,
    selectedPenName: app.selectedPenName,
    effects: app.effects,
    count: app.count,
    isRainbowMode: app.isRainbowMode,
    rainbowSaturation: app.rainbowSaturation,
    rainbowBrightness: app.rainbowBrightness,
    isFadeMode: app.isFadeMode,
    isAutoMode: app.isAutoMode,
    isYamiMode: app.isYamiMode,
    yamiStrength: app.yamiStrength,
    isSymmetryMode: app.isSymmetryMode,
    symmetryType: app.symmetryType,
    symmetryCount: app.symmetryCount,
    symmetryOriginX: app.symmetryOriginX,
    symmetryOriginY: app.symmetryOriginY,
    margin: app.margin,
    penCustomParams: app.penCustomParams,
  };
}

function restoreAppState(snapshot: AppSnapshot): void {
  app.canvas = snapshot.canvas;
  app.c = snapshot.c;
  app.width = snapshot.width;
  app.height = snapshot.height;
  app.penSize = snapshot.penSize;
  app.penColor = snapshot.penColor;
  app.penTool = snapshot.penTool;
  app.selectedPenName = snapshot.selectedPenName;
  app.effects = snapshot.effects;
  app.count = snapshot.count;
  app.isRainbowMode = snapshot.isRainbowMode;
  app.rainbowSaturation = snapshot.rainbowSaturation;
  app.rainbowBrightness = snapshot.rainbowBrightness;
  app.isFadeMode = snapshot.isFadeMode;
  app.isAutoMode = snapshot.isAutoMode;
  app.isYamiMode = snapshot.isYamiMode;
  app.yamiStrength = snapshot.yamiStrength;
  app.isSymmetryMode = snapshot.isSymmetryMode;
  app.symmetryType = snapshot.symmetryType;
  app.symmetryCount = snapshot.symmetryCount;
  app.symmetryOriginX = snapshot.symmetryOriginX;
  app.symmetryOriginY = snapshot.symmetryOriginY;
  app.margin = snapshot.margin;
  app.penCustomParams = snapshot.penCustomParams;
}

const PREVIEW_SIZE = 80;
const REFERENCE_SIZE = 800;
const MAX_EFFECTS = 200;
const S_CURVE_PATH = "M 10,90 C 30,10 70,10 50,50 C 30,90 70,90 90,10";

let cachedPathPoints: Point[] | null = null;

function getPathPoints(): Point[] {
  if (!cachedPathPoints) {
    const raw = sampleSvgPathPoints(S_CURVE_PATH, 2);
    cachedPathPoints = fitPointsToCanvas(raw, PREVIEW_SIZE, PREVIEW_SIZE, 8);
  }
  return cachedPathPoints;
}

function renderPreviewFrame(preview: PreviewState): void {
  const { config } = preview;
  const snapshot = saveAppState();
  const originalLifeSnapToGrid = snapshot.penCustomParams.life_pen?.snap_to_grid;
  const originalNormalUseCrayonTexture = snapshot.penCustomParams.normal_pen?.use_crayon_texture;

  try {
    const scale = PREVIEW_SIZE / REFERENCE_SIZE;

    app.canvas = preview.canvas;
    app.c = preview.ctx;
    app.width = PREVIEW_SIZE;
    app.height = PREVIEW_SIZE;
    app.penSize = Math.max(1, config.source.size * scale);
    app.penColor = config.penColor;
    app.penTool = config.penTool;
    app.selectedPenName = config.source.pen;
    app.effects = preview.effects;
    app.count = preview.count;
    app.isRainbowMode = config.source.rainbowMode;
    app.rainbowSaturation = config.source.rainbowSaturation;
    app.rainbowBrightness = config.source.rainbowBrightness;
    app.isFadeMode = config.source.fadeMode;
    app.isAutoMode = true;
    app.isYamiMode = config.source.yamiMode;
    app.yamiStrength = config.source.yamiStrength;
    app.isSymmetryMode = config.source.symmetryMode;
    app.symmetryType = config.source.symmetryType;
    app.symmetryCount = config.source.symmetryCount;
    app.symmetryOriginX = config.source.symmetryOriginX / 100;
    app.symmetryOriginY = config.source.symmetryOriginY / 100;
    app.margin = config.margin;

    if (typeof config.source.lifeSnapToGrid === "boolean" && app.penCustomParams.life_pen) {
      app.penCustomParams.life_pen.snap_to_grid = config.source.lifeSnapToGrid;
    }

    if (typeof config.source.normalUseCrayonTexture === "boolean" && app.penCustomParams.normal_pen) {
      app.penCustomParams.normal_pen.use_crayon_texture = config.source.normalUseCrayonTexture;
    }

    preview.count += 1;
    app.count = preview.count;

    // Rainbow color cycling
    if (config.source.rainbowMode) {
      app.penColor = hsvToRgb(
        (preview.count % 60) * 6,
        config.source.rainbowSaturation,
        config.source.rainbowBrightness,
      );
    }

    // Fade mode
    if (config.source.fadeMode) {
      app.c!.globalCompositeOperation = "source-over";
      app.c!.fillStyle = colorToString({ r: 0, g: 0, b: 0 }, 0.05);
      app.c!.fillRect(0, 0, PREVIEW_SIZE, PREVIEW_SIZE);
    }

    // Composite operation
    app.c!.globalCompositeOperation = getDrawCompositeOperation();

    // Draw
    if (app.penTool) {
      let x: number;
      let y: number;

      if (config.source.autoMode) {
        x = Math.floor(Math.random() * PREVIEW_SIZE);
        y = Math.floor(Math.random() * PREVIEW_SIZE);
      } else if (preview.pathPoints) {
        const len = preview.pathPoints.length;
        const loop = Math.floor(preview.pathIndex / len);
        const pt = preview.pathPoints[preview.pathIndex % len];
        const xOffset = (loop * 12) % PREVIEW_SIZE;
        x = (pt.x + xOffset) % PREVIEW_SIZE;
        y = pt.y;
        preview.pathIndex += 1;
      } else {
        x = Math.floor(Math.random() * PREVIEW_SIZE);
        y = Math.floor(Math.random() * PREVIEW_SIZE);
      }

      if (!config.source.symmetryMode) {
        app.penTool.draw(x, y);
      } else {
        forEachSymmetryPoint(
          x,
          y,
          config.centerX,
          config.centerY,
          config.source.symmetryCount,
          config.source.symmetryType,
          (px, py) => {
            app.penTool?.draw(px, py);
          },
        );
      }
    }

    stepEffectsInPlace(preview.effects, MAX_EFFECTS);
    app.effects = preview.effects;
  } finally {
    if (originalLifeSnapToGrid !== undefined && snapshot.penCustomParams.life_pen) {
      snapshot.penCustomParams.life_pen.snap_to_grid = originalLifeSnapToGrid;
    }
    if (originalNormalUseCrayonTexture !== undefined && snapshot.penCustomParams.normal_pen) {
      snapshot.penCustomParams.normal_pen.use_crayon_texture = originalNormalUseCrayonTexture;
    }
    restoreAppState(snapshot);
  }
}

let previewTimerId: number | null = null;
let previewStates: Map<string, PreviewState> | null = null;

export function startPreviewAnimations(
  buttons: HTMLButtonElement[],
  configs: Record<string, SimplePresetConfig>,
): void {
  stopPreviewAnimations();

  previewStates = new Map();

  for (const button of buttons) {
    const key = button.dataset.simplePreset;
    if (!key || !configs[key]) continue;

    let canvas = button.querySelector<HTMLCanvasElement>("canvas");
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.width = PREVIEW_SIZE;
      canvas.height = PREVIEW_SIZE;
      button.appendChild(canvas);
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) continue;

    // Yami presets start white (they darken), others start black
    const config = configs[key];
    ctx.fillStyle = config.yamiMode ? "#ffffff" : "#000000";
    ctx.fillRect(0, 0, PREVIEW_SIZE, PREVIEW_SIZE);

    previewStates.set(key, {
      canvas,
      ctx,
      config: {
        source: config,
        penTool: app.penTools[config.pen] ?? null,
        penColor: hexToRgb(config.colorHex),
        centerX: PREVIEW_SIZE * (config.symmetryOriginX / 100),
        centerY: PREVIEW_SIZE * (config.symmetryOriginY / 100),
        margin: Math.max(2, 40 * (PREVIEW_SIZE / REFERENCE_SIZE)),
      },
      effects: [],
      count: 0,
      pathPoints: config.autoMode ? null : getPathPoints(),
      pathIndex: 0,
    });
  }

  previewTimerId = window.setInterval(() => {
    if (!previewStates) {
      return;
    }
    for (const preview of previewStates.values()) {
      renderPreviewFrame(preview);
    }
  }, Math.round(1000 / 15));
}

export function stopPreviewAnimations(): void {
  if (previewTimerId !== null) {
    window.clearInterval(previewTimerId);
    previewTimerId = null;
  }
  if (previewStates) {
    for (const preview of previewStates.values()) {
      preview.effects = [];
      preview.count = 0;
      preview.ctx.clearRect(0, 0, PREVIEW_SIZE, PREVIEW_SIZE);
    }
  }
  previewStates = null;
}
