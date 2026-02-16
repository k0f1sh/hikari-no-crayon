import { app } from "../core/state";
import { hexToRgb, hsvToRgb, colorToString } from "../core/color";
import { getDrawCompositeOperation } from "../core/draw";
import type { Color, Effect, PenTool } from "../types";

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
};

interface PreviewState {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  effects: Effect[];
  count: number;
}

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

function renderPreviewFrame(
  config: SimplePresetConfig,
  preview: PreviewState,
): void {
  const snapshot = saveAppState();
  try {
    const scale = PREVIEW_SIZE / REFERENCE_SIZE;

    app.canvas = preview.canvas;
    app.c = preview.ctx;
    app.width = PREVIEW_SIZE;
    app.height = PREVIEW_SIZE;
    app.penSize = Math.max(1, config.size * scale);
    app.penColor = hexToRgb(config.colorHex);
    app.penTool = app.penTools[config.pen] ?? null;
    app.selectedPenName = config.pen;
    app.effects = preview.effects;
    app.count = preview.count;
    app.isRainbowMode = config.rainbowMode;
    app.rainbowSaturation = config.rainbowSaturation;
    app.rainbowBrightness = config.rainbowBrightness;
    app.isFadeMode = config.fadeMode;
    app.isAutoMode = true;
    app.isYamiMode = config.yamiMode;
    app.yamiStrength = config.yamiStrength;
    app.isSymmetryMode = config.symmetryMode;
    app.symmetryType = config.symmetryType;
    app.symmetryCount = config.symmetryCount;
    app.symmetryOriginX = config.symmetryOriginX / 100;
    app.symmetryOriginY = config.symmetryOriginY / 100;
    app.margin = Math.max(2, 40 * scale);

    if (typeof config.lifeSnapToGrid === "boolean") {
      app.penCustomParams = {
        ...snapshot.penCustomParams,
        life_pen: { ...snapshot.penCustomParams.life_pen, snap_to_grid: config.lifeSnapToGrid },
      };
    }

    preview.count += 1;
    app.count = preview.count;

    // Rainbow color cycling
    if (config.rainbowMode) {
      app.penColor = hsvToRgb(
        (preview.count % 60) * 6,
        config.rainbowSaturation,
        config.rainbowBrightness,
      );
    }

    // Fade mode
    if (config.fadeMode) {
      app.c!.globalCompositeOperation = "source-over";
      app.c!.fillStyle = colorToString({ r: 0, g: 0, b: 0 }, 0.05);
      app.c!.fillRect(0, 0, PREVIEW_SIZE, PREVIEW_SIZE);
    }

    // Composite operation
    app.c!.globalCompositeOperation = getDrawCompositeOperation();

    // Auto-draw
    if (app.penTool) {
      const x = Math.floor(Math.random() * PREVIEW_SIZE);
      const y = Math.floor(Math.random() * PREVIEW_SIZE);

      if (!config.symmetryMode) {
        app.penTool.draw(x, y);
      } else {
        const centerX = PREVIEW_SIZE * (config.symmetryOriginX / 100);
        const centerY = PREVIEW_SIZE * (config.symmetryOriginY / 100);
        const dx = x - centerX;
        const dy = y - centerY;
        const count = Math.max(1, config.symmetryCount);

        for (let i = 0; i < count; i += 1) {
          const angle = (Math.PI * 2 * i) / count;
          const cos = Math.cos(angle);
          const sin = Math.sin(angle);
          app.penTool.draw(centerX + dx * cos - dy * sin, centerY + dx * sin + dy * cos);

          if (config.symmetryType === "mirror") {
            app.penTool.draw(centerX + dx * cos + dy * sin, centerY + dx * sin - dy * cos);
          }
        }
      }
    }

    // Process effects
    preview.effects.forEach((effect) => {
      effect.move();
      effect.render();
    });
    preview.effects = preview.effects.filter((e) => !e.delFlg);
    if (preview.effects.length > MAX_EFFECTS) {
      preview.effects = preview.effects.slice(-MAX_EFFECTS);
    }
    app.effects = preview.effects;
  } finally {
    restoreAppState(snapshot);
  }
}

let previewAnimId: number | null = null;
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
      effects: [],
      count: 0,
    });
  }

  let frameSkip = 0;
  function tick() {
    frameSkip += 1;
    if (frameSkip % 4 === 0 && previewStates) {
      for (const [key, preview] of previewStates) {
        const config = configs[key];
        if (config) {
          renderPreviewFrame(config, preview);
        }
      }
    }
    previewAnimId = requestAnimationFrame(tick);
  }
  previewAnimId = requestAnimationFrame(tick);
}

export function stopPreviewAnimations(): void {
  if (previewAnimId !== null) {
    cancelAnimationFrame(previewAnimId);
    previewAnimId = null;
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
