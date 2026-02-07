import "./style.css";
import "../lib/StackBlur.js";
import { hsvToRgb, colorToString } from "./core/color";
import { app } from "./core/state";
import { clear, drawPreviewCircle } from "./core/draw";
import { createPenTools, defaultPenName, defaultPenColor } from "./tools";
import { bindUiEvents } from "./ui/bindings";
import { captureHistorySnapshot, resetHistory } from "./core/history";
import { renderHud } from "./core/hud";

function initCanvas(): void {
  app.width = window.innerWidth;
  app.height = window.innerHeight;

  app.canvas = document.getElementById("canvas") as HTMLCanvasElement | null;
  app.preCanvas = document.getElementById("pre") as HTMLCanvasElement | null;
  app.hudCanvas = document.getElementById("hud") as HTMLCanvasElement | null;

  if (!app.canvas || !app.preCanvas || !app.hudCanvas) {
    throw new Error("Canvas elements were not found");
  }

  app.canvas.width = app.width;
  app.canvas.height = app.height;
  app.preCanvas.width = app.toolboxWidth;
  app.preCanvas.height = 50;
  app.hudCanvas.width = app.width;
  app.hudCanvas.height = app.height;

  app.c = app.canvas.getContext("2d");
  app.preC = app.preCanvas.getContext("2d");
  app.hudC = app.hudCanvas.getContext("2d");

  if (!app.c || !app.preC || !app.hudC) {
    throw new Error("2D context initialization failed");
  }

  clear(app.c);
  clear(app.preC);
  app.c.globalCompositeOperation = "lighter";
}

function updatePreviewCanvas(): void {
  clear(app.preC!);
  drawPreviewCircle(100, 25, app.penSize, app.penColor);
}

function renderLoop(): void {
  app.count += 1;

  if (app.isFadeMode) {
    app.c!.globalCompositeOperation = "source-over";
    app.c!.fillStyle = colorToString({ r: 0, g: 0, b: 0 }, 0.05);
    app.c!.fillRect(0, 0, app.width, app.height);
    app.c!.globalCompositeOperation = "lighter";
  }

  if (app.isAutoMode && app.penTool) {
    app.penTool.draw(
      Math.floor(Math.random() * app.width),
      Math.floor(Math.random() * app.height),
    );
  }

  if (app.isRainbowMode) {
    app.penColor = hsvToRgb((app.count % 60) * 6, 200, 200);
  }

  app.effects.forEach((effect) => {
    effect.move();
    effect.render();
  });
  app.effects = app.effects.filter((effect) => !effect.delFlg);

  updatePreviewCanvas();
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
