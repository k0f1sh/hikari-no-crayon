import "./style.css";
import { hsvToRgb, colorToString } from "./core/color";
import { app } from "./core/state";
import { applyDrawCompositeOperation, clear, getDrawCompositeOperation } from "./core/draw";
import { createPenTools, defaultPenName, defaultPenColor } from "./tools";
import { bindUiEvents } from "./ui/bindings";
import { captureHistorySnapshot, resetHistory } from "./core/history";
import { renderHud } from "./core/hud";
import { stepEffectsInPlace } from "./core/effects";
import { forEachSymmetryPoint } from "./core/symmetry";

function initCanvas(): void {
  app.width = window.innerWidth;
  app.height = window.innerHeight;

  app.canvas = document.getElementById("canvas") as HTMLCanvasElement | null;
  app.hudCanvas = document.getElementById("hud") as HTMLCanvasElement | null;

  if (!app.canvas || !app.hudCanvas) {
    throw new Error("Canvas elements were not found");
  }

  app.canvas.width = app.width;
  app.canvas.height = app.height;
  app.hudCanvas.width = app.width;
  app.hudCanvas.height = app.height;

  app.c = app.canvas.getContext("2d");
  app.hudC = app.hudCanvas.getContext("2d");

  if (!app.c || !app.hudC) {
    throw new Error("2D context initialization failed");
  }

  clear(app.c);
  applyDrawCompositeOperation();
}

function renderLoop(): void {
  app.count += 1;

  if (app.isFadeMode) {
    let effectiveFade = app.fadeStrength / 100;
    if (app.isAutoMode) {
      effectiveFade = Math.min(effectiveFade, 0.04);
    }
    app.c!.globalCompositeOperation = "source-over";
    app.c!.fillStyle = colorToString({ r: 3, g: 5, b: 8 }, effectiveFade);
    app.c!.fillRect(0, 0, app.width, app.height);
  }
  app.c!.globalCompositeOperation = getDrawCompositeOperation();

  if (app.isAutoMode && app.penTool && app.count % (11 - app.autoSpeed) === 0) {
    for (let d = 0; d < app.autoDensity; d += 1) {
      const x = Math.floor(Math.random() * app.width);
      const y = Math.floor(Math.random() * app.height);

      if (!app.isSymmetryMode) {
        app.penTool.draw(x, y);
      } else {
        const centerX = app.width * app.symmetryOriginX;
        const centerY = app.height * app.symmetryOriginY;
        forEachSymmetryPoint(x, y, centerX, centerY, app.symmetryCount, app.symmetryType, (px, py) => {
          app.penTool?.draw(px, py);
        });
      }
    }
  }

  if (app.isRainbowMode) {
    app.penColor = hsvToRgb((app.count % 60) * 6, app.rainbowSaturation, app.rainbowBrightness);
  }

  stepEffectsInPlace(app.effects);

  renderHud();
  window.requestAnimationFrame(renderLoop);
}

function setupResize(): void {
  window.addEventListener("resize", () => {
    const previousCanvas = document.createElement("canvas");
    previousCanvas.width = app.canvas!.width;
    previousCanvas.height = app.canvas!.height;
    const previousContext = previousCanvas.getContext("2d");
    if (previousContext) {
      previousContext.drawImage(app.canvas!, 0, 0);
    }

    app.width = window.innerWidth;
    app.height = window.innerHeight;
    app.canvas!.width = app.width;
    app.canvas!.height = app.height;
    app.hudCanvas!.width = app.width;
    app.hudCanvas!.height = app.height;
    clear(app.c!);
    if (previousContext) {
      app.c!.globalCompositeOperation = "source-over";
      app.c!.drawImage(previousCanvas, 0, 0);
    }
    applyDrawCompositeOperation();
    app.effects = [];
    resetHistory();
    captureHistorySnapshot();
  });
}

function setupMobileViewportGuards(): void {
  const preventDefault = (event: Event) => {
    event.preventDefault();
  };

  // iPad Safari pinch zoom gesture events.
  document.addEventListener("gesturestart", preventDefault, { passive: false });
  document.addEventListener("gesturechange", preventDefault, { passive: false });
  document.addEventListener("gestureend", preventDefault, { passive: false });

  // Prevent pinch zoom via multi-touch while keeping single-touch UI interactions working.
  document.addEventListener(
    "touchmove",
    (event) => {
      if (event.touches.length > 1) {
        event.preventDefault();
      }
    },
    { passive: false },
  );

  // Prevent browser zoom on trackpads / external input devices.
  window.addEventListener(
    "wheel",
    (event) => {
      if (event.ctrlKey) {
        event.preventDefault();
      }
    },
    { passive: false },
  );
}

function init(): void {
  app.penColor = defaultPenColor;
  app.selectedPenName = defaultPenName;
  app.penTools = createPenTools();
  app.penTool = app.penTools[defaultPenName];

  setupMobileViewportGuards();
  initCanvas();
  resetHistory();
  captureHistorySnapshot();
  bindUiEvents();
  setupResize();
  renderLoop();
  document.documentElement.classList.add("app-ready");
}

window.addEventListener("load", init);
