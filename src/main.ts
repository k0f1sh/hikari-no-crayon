import "./style.css";
import { hsvToRgb, colorToString } from "./core/color";
import { app } from "./core/state";
import { applyDrawCompositeOperation, clear, getDrawCompositeOperation } from "./core/draw";
import { createPenTools, defaultPenName, defaultPenColor } from "./tools";
import { bindUiEvents } from "./ui/bindings";
import { captureHistorySnapshot, resetHistory } from "./core/history";
import { renderHud } from "./core/hud";

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
    app.c!.globalCompositeOperation = "source-over";
    app.c!.fillStyle = colorToString({ r: 0, g: 0, b: 0 }, 0.05);
    app.c!.fillRect(0, 0, app.width, app.height);
  }
  app.c!.globalCompositeOperation = getDrawCompositeOperation();

  if (app.isAutoMode && app.penTool) {
    const x = Math.floor(Math.random() * app.width);
    const y = Math.floor(Math.random() * app.height);

    if (!app.isSymmetryMode) {
      app.penTool.draw(x, y);
    } else {
      const centerX = app.width * app.symmetryOriginX;
      const centerY = app.height * app.symmetryOriginY;
      const dx = x - centerX;
      const dy = y - centerY;
      const count = Math.max(1, app.symmetryCount);

      for (let i = 0; i < count; i += 1) {
        const angle = (Math.PI * 2 * i) / count;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const rx = dx * cos - dy * sin;
        const ry = dx * sin + dy * cos;
        app.penTool.draw(centerX + rx, centerY + ry);

        if (app.symmetryType === "mirror") {
          const mx = dx * cos + dy * sin;
          const my = dx * sin - dy * cos;
          app.penTool.draw(centerX + mx, centerY + my);
        }
      }
    }
  }

  if (app.isRainbowMode) {
    app.penColor = hsvToRgb((app.count % 60) * 6, 200, 200);
  }

  app.effects.forEach((effect) => {
    effect.move();
    effect.render();
  });
  app.effects = app.effects.filter((effect) => !effect.delFlg);

  renderHud();
  window.requestAnimationFrame(renderLoop);
}

function setupResize(): void {
  window.addEventListener("resize", () => {
    app.width = window.innerWidth;
    app.height = window.innerHeight;
    app.canvas!.width = app.width;
    app.canvas!.height = app.height;
    app.hudCanvas!.width = app.width;
    app.hudCanvas!.height = app.height;
    clear(app.c!);
    app.effects = [];
    resetHistory();
    captureHistorySnapshot();
  });
}

function init(): void {
  app.penColor = defaultPenColor;
  app.selectedPenName = defaultPenName;
  app.penTools = createPenTools();
  app.penTool = app.penTools[defaultPenName];

  initCanvas();
  resetHistory();
  captureHistorySnapshot();
  bindUiEvents();
  setupResize();
  renderLoop();
}

window.addEventListener("load", init);
