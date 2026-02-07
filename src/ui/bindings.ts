import { app, requireCanvas } from "../core/state";
import { clear, blurImage, reverseImage } from "../core/draw";
import { hexToRgb, hsvToRgb, rgbToHex } from "../core/color";
import {
  canRedo,
  canUndo,
  captureHistorySnapshot,
  redo,
  undo,
} from "../core/history";
import {
  colorFromSettings,
  defaultPersistedSettings,
  loadSettings,
  saveSettings,
  type PersistedSettings,
} from "../core/persistence";
import { exportPng } from "../core/export";

function byId<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id) as T | null;
  if (!el) {
    throw new Error(`Element not found: #${id}`);
  }
  return el;
}

function setSectionToggle(headerId: string, bodyId: string): void {
  const header = byId<HTMLElement>(headerId);
  const body = byId<HTMLElement>(bodyId);
  body.style.display = "none";

  header.addEventListener("click", () => {
    body.style.display = body.style.display === "none" ? "block" : "none";
  });
}

function setupRadioGroup(name: string, onChange: (value: string) => void) {
  const inputs = Array.from(document.querySelectorAll<HTMLInputElement>(`input[name=${name}]`));

  const applySelected = (target: HTMLInputElement) => {
    inputs.forEach((input) => {
      input.closest("label")?.classList.remove("selected");
    });
    target.closest("label")?.classList.add("selected");
    onChange(target.value);
  };

  inputs.forEach((input) => {
    input.addEventListener("change", () => {
      if (input.checked) {
        applySelected(input);
      }
    });

    input.closest("label")?.addEventListener("click", () => {
      if (!input.checked) {
        input.checked = true;
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });
  });

  return {
    inputs,
    clearSelection: () => {
      inputs.forEach((input) => {
        input.checked = false;
        input.closest("label")?.classList.remove("selected");
      });
    },
    selectByValue: (value: string) => {
      const found = inputs.find((input) => input.value === value);
      if (!found) {
        return false;
      }
      found.checked = true;
      found.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    },
    highlightByValue: (value: string) => {
      const found = inputs.find((input) => input.value === value);
      if (!found) {
        return false;
      }
      inputs.forEach((input) => {
        input.closest("label")?.classList.remove("selected");
      });
      found.closest("label")?.classList.add("selected");
      return true;
    },
    dispatchChecked: () => {
      const checked = inputs.find((input) => input.checked);
      if (checked) {
        checked.dispatchEvent(new Event("change", { bubbles: true }));
      }
    },
  };
}

function setPointerPosition(event: PointerEvent): void {
  app.mouse.x = event.pageX;
  app.mouse.y = event.pageY;
}

function findHueByColorHex(hex: string): string {
  const rgb = hexToRgb(hex);
  let bestHue = 0;
  let bestDistance = Number.POSITIVE_INFINITY;

  [0, 40, 80, 120, 160, 200, 240, 280, 320].forEach((hue) => {
    const candidate = hsvToRgb(hue, 200, 200);
    const distance =
      Math.abs(candidate.r - rgb.r) + Math.abs(candidate.g - rgb.g) + Math.abs(candidate.b - rgb.b);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestHue = hue;
    }
  });

  return String(bestHue);
}

export function bindUiEvents(): void {
  let showMenu = true;

  const switchButton = byId<HTMLElement>("switch");
  const menu = byId<HTMLElement>("menu");
  const sizeRange = byId<HTMLInputElement>("size_range");
  const sizeValue = byId<HTMLElement>("size_value");
  const colorPicker = byId<HTMLInputElement>("color_picker");
  const exportScale = byId<HTMLSelectElement>("export_scale");
  const exportTransparent = byId<HTMLInputElement>("export_transparent");
  const undoButton = byId<HTMLElement>("undo_button");
  const redoButton = byId<HTMLElement>("redo_button");

  const persist = () => {
    const settings: PersistedSettings = {
      pen: app.selectedPenName,
      size: app.penSize,
      colorHex: rgbToHex(app.penColor),
      rainbowMode: app.isRainbowMode,
      fadeMode: app.isFadeMode,
      autoMode: app.isAutoMode,
      exportScale: Number(exportScale.value),
      exportTransparent: exportTransparent.checked,
    };
    saveSettings(settings);
  };

  const refreshUndoRedoButtons = () => {
    const undoEnabled = canUndo();
    const redoEnabled = canRedo();
    undoButton.classList.toggle("is-disabled", !undoEnabled);
    redoButton.classList.toggle("is-disabled", !redoEnabled);
    undoButton.setAttribute("aria-disabled", String(!undoEnabled));
    redoButton.setAttribute("aria-disabled", String(!redoEnabled));
  };

  const commitHistory = () => {
    captureHistorySnapshot();
    refreshUndoRedoButtons();
  };

  const applySize = (value: number) => {
    app.penSize = Math.max(5, Math.min(400, value));
    sizeRange.value = String(app.penSize);
    sizeValue.textContent = `${app.penSize}px`;
    persist();
  };

  const applyColor = (hex: string) => {
    app.penColor = colorFromSettings(hex);
    colorPicker.value = rgbToHex(app.penColor);
    persist();
  };

  switchButton.addEventListener("click", () => {
    showMenu = !showMenu;
    menu.style.display = showMenu ? "block" : "none";
    switchButton.textContent = showMenu ? "hide" : "show";
  });

  setSectionToggle("slh", "sl");
  setSectionToggle("plh", "pl");
  setSectionToggle("clh", "cl");
  setSectionToggle("mlh", "ml");
  setSectionToggle("etch", "etc");

  const penGroup = setupRadioGroup("pen", (value) => {
    app.selectedPenName = value;
    app.penTool = app.penTools[value];
    persist();
  });

  const sizeGroup = setupRadioGroup("size", (value) => {
    applySize(Number(value));
  });

  const colorGroup = setupRadioGroup("color", (value) => {
    app.penColor = hsvToRgb(Number(value), 200, 200);
    colorPicker.value = rgbToHex(app.penColor);
    persist();
  });

  sizeRange.addEventListener("input", (event) => {
    const value = Number((event.currentTarget as HTMLInputElement).value);
    applySize(value);

    const exact = sizeGroup.inputs.find((input) => Number(input.value) === value);
    if (exact) {
      sizeGroup.selectByValue(exact.value);
    } else {
      sizeGroup.clearSelection();
    }
  });

  colorPicker.addEventListener("input", (event) => {
    const value = (event.currentTarget as HTMLInputElement).value;
    applyColor(value);
    colorGroup.clearSelection();
    colorGroup.highlightByValue(findHueByColorHex(value));
  });

  byId<HTMLInputElement>("rainbow_mode").addEventListener("change", (event) => {
    app.isRainbowMode = (event.currentTarget as HTMLInputElement).checked;
    persist();
  });

  byId<HTMLInputElement>("auto_mode").addEventListener("change", (event) => {
    app.isAutoMode = (event.currentTarget as HTMLInputElement).checked;
    persist();
  });

  byId<HTMLInputElement>("fade_mode").addEventListener("change", (event) => {
    app.isFadeMode = (event.currentTarget as HTMLInputElement).checked;
    persist();
  });

  exportScale.addEventListener("change", persist);
  exportTransparent.addEventListener("change", persist);

  byId<HTMLElement>("clear_button").addEventListener("click", () => {
    clear(app.c!);
    app.effects = [];
    commitHistory();
  });

  byId<HTMLElement>("reverse_button").addEventListener("click", () => {
    reverseImage();
    commitHistory();
  });

  byId<HTMLElement>("blur_button").addEventListener("click", () => {
    blurImage();
    commitHistory();
  });

  byId<HTMLElement>("save_button").addEventListener("click", () => {
    exportPng({
      scale: Number(exportScale.value),
      transparent: exportTransparent.checked,
    });
  });

  undoButton.addEventListener("click", () => {
    if (undo()) {
      refreshUndoRedoButtons();
    }
  });

  redoButton.addEventListener("click", () => {
    if (redo()) {
      refreshUndoRedoButtons();
    }
  });

  window.addEventListener("keydown", (event) => {
    const isMeta = event.ctrlKey || event.metaKey;
    if (!isMeta) {
      return;
    }

    const key = event.key.toLowerCase();
    if (key === "z" && event.shiftKey) {
      event.preventDefault();
      if (redo()) {
        refreshUndoRedoButtons();
      }
      return;
    }

    if (key === "z") {
      event.preventDefault();
      if (undo()) {
        refreshUndoRedoButtons();
      }
      return;
    }

    if (key === "y") {
      event.preventDefault();
      if (redo()) {
        refreshUndoRedoButtons();
      }
    }
  });

  const canvas = requireCanvas();
  canvas.style.touchAction = "none";

  canvas.addEventListener("pointermove", (event) => {
    setPointerPosition(event);
    app.c!.globalCompositeOperation = "lighter";
    if (app.isDown && app.penTool) {
      app.penTool.draw(event.pageX, event.pageY);
      app.didDrawInStroke = true;
    }
  });

  canvas.addEventListener("pointerdown", (event) => {
    app.isDown = true;
    app.didDrawInStroke = false;
    setPointerPosition(event);
    app.penTool?.draw(event.pageX, event.pageY);
    app.didDrawInStroke = true;
  });

  const stopDrawing = () => {
    app.isDown = false;
    if (app.didDrawInStroke) {
      commitHistory();
      app.didDrawInStroke = false;
    }
  };

  canvas.addEventListener("pointerup", stopDrawing);
  canvas.addEventListener("pointercancel", stopDrawing);
  canvas.addEventListener("pointerleave", stopDrawing);
  canvas.addEventListener("mouseout", () => {
    app.mouse.x = "none";
    app.mouse.y = "none";
  });

  const settings = loadSettings();
  const safeSettings: PersistedSettings = {
    ...defaultPersistedSettings,
    ...settings,
  };

  penGroup.selectByValue(safeSettings.pen) || penGroup.selectByValue(defaultPersistedSettings.pen);
  applySize(safeSettings.size);
  if (!sizeGroup.selectByValue(String(safeSettings.size))) {
    sizeGroup.clearSelection();
  }
  applyColor(safeSettings.colorHex);
  colorGroup.clearSelection();
  colorGroup.highlightByValue(findHueByColorHex(safeSettings.colorHex));

  byId<HTMLInputElement>("rainbow_mode").checked = safeSettings.rainbowMode;
  app.isRainbowMode = safeSettings.rainbowMode;

  byId<HTMLInputElement>("fade_mode").checked = safeSettings.fadeMode;
  app.isFadeMode = safeSettings.fadeMode;

  byId<HTMLInputElement>("auto_mode").checked = safeSettings.autoMode;
  app.isAutoMode = safeSettings.autoMode;

  exportScale.value = String(safeSettings.exportScale);
  exportTransparent.checked = safeSettings.exportTransparent;

  refreshUndoRedoButtons();
}
