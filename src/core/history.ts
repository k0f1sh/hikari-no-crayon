import { app, requireMainContext } from "./state";

const MAX_HISTORY = 50;

function cloneCurrentImageData(): ImageData {
  const c = requireMainContext();
  return c.getImageData(0, 0, app.width, app.height);
}

function restoreImageData(imageData: ImageData): void {
  const c = requireMainContext();
  c.putImageData(imageData, 0, 0);
}

export function resetHistory(): void {
  app.historyStack = [];
  app.historyIndex = -1;
  app.didDrawInStroke = false;
}

export function captureHistorySnapshot(): void {
  const snapshot = cloneCurrentImageData();

  if (app.historyIndex < app.historyStack.length - 1) {
    app.historyStack = app.historyStack.slice(0, app.historyIndex + 1);
  }

  app.historyStack.push(snapshot);
  if (app.historyStack.length > MAX_HISTORY) {
    const dropCount = app.historyStack.length - MAX_HISTORY;
    app.historyStack = app.historyStack.slice(dropCount);
  }

  app.historyIndex = app.historyStack.length - 1;
}

export function canUndo(): boolean {
  return app.historyIndex > 0;
}

export function canRedo(): boolean {
  return app.historyIndex >= 0 && app.historyIndex < app.historyStack.length - 1;
}

export function undo(): boolean {
  if (!canUndo()) {
    return false;
  }

  app.historyIndex -= 1;
  restoreImageData(app.historyStack[app.historyIndex]);
  return true;
}

export function redo(): boolean {
  if (!canRedo()) {
    return false;
  }

  app.historyIndex += 1;
  restoreImageData(app.historyStack[app.historyIndex]);
  return true;
}
