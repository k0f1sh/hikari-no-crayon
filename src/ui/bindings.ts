import { app, requireCanvas } from "../core/state";
import { clear, blurImage, reverseImage } from "../core/draw";
import { rgbToHex } from "../core/color";
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
  const symmetryMode = byId<HTMLInputElement>("symmetry_mode");
  const symmetryHud = byId<HTMLInputElement>("symmetry_hud");
  const symmetryType = byId<HTMLSelectElement>("symmetry_type");
  const symmetryCount = byId<HTMLSelectElement>("symmetry_count");
  const symmetryOriginX = byId<HTMLInputElement>("symmetry_origin_x");
  const symmetryOriginY = byId<HTMLInputElement>("symmetry_origin_y");
  const symmetryOriginXValue = byId<HTMLElement>("symmetry_origin_x_value");
  const symmetryOriginYValue = byId<HTMLElement>("symmetry_origin_y_value");
  const symmetryOriginXReset = byId<HTMLButtonElement>("symmetry_origin_x_reset");
  const symmetryOriginYReset = byId<HTMLButtonElement>("symmetry_origin_y_reset");

  const persist = () => {
    const settings: PersistedSettings = {
      pen: app.selectedPenName,
      size: app.penSize,
      colorHex: rgbToHex(app.penColor),
      rainbowMode: app.isRainbowMode,
      fadeMode: app.isFadeMode,
      autoMode: app.isAutoMode,
      symmetryMode: app.isSymmetryMode,
      symmetryHud: app.isSymmetryHudVisible,
      symmetryType: app.symmetryType,
      symmetryCount: app.symmetryCount,
      symmetryOriginX: Math.round(app.symmetryOriginX * 100),
      symmetryOriginY: Math.round(app.symmetryOriginY * 100),
      exportScale: Number(exportScale.value),
      exportTransparent: exportTransparent.checked,
    };
    saveSettings(settings);
  };

  const drawWithSymmetry = (x: number, y: number) => {
    if (!app.penTool) {
      return;
    }

    if (!app.isSymmetryMode) {
      app.penTool.draw(x, y);
      return;
    }

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
  };

  const refreshUndoRedoButtons = () => {
    const undoEnabled = canUndo();
    const redoEnabled = canRedo();
    undoButton.classList.toggle("is-disabled", !undoEnabled);
    redoButton.classList.toggle("is-disabled", !redoEnabled);
    undoButton.setAttribute("aria-disabled", String(!undoEnabled));
    redoButton.setAttribute("aria-disabled", String(!redoEnabled));
  };

  const updateSymmetryControlsState = () => {
    const disabled = !app.isSymmetryMode;

    symmetryHud.disabled = disabled;
    symmetryType.disabled = disabled;
    symmetryCount.disabled = disabled;
    symmetryOriginX.disabled = disabled;
    symmetryOriginY.disabled = disabled;
    symmetryOriginXReset.disabled = disabled;
    symmetryOriginYReset.disabled = disabled;

    symmetryHud.closest("label")?.classList.toggle("is-disabled", disabled);
    symmetryType.closest("label")?.classList.toggle("is-disabled", disabled);
    symmetryCount.closest("label")?.classList.toggle("is-disabled", disabled);
    symmetryOriginX.closest("label")?.classList.toggle("is-disabled", disabled);
    symmetryOriginY.closest("label")?.classList.toggle("is-disabled", disabled);
  };

  const applySymmetryOriginX = (value: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(value)));
    symmetryOriginX.value = String(clamped);
    symmetryOriginXValue.textContent = `${clamped}%`;
    app.symmetryOriginX = clamped / 100;
    persist();
  };

  const applySymmetryOriginY = (value: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(value)));
    symmetryOriginY.value = String(clamped);
    symmetryOriginYValue.textContent = `${clamped}%`;
    app.symmetryOriginY = clamped / 100;
    persist();
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

  const penGroup = setupRadioGroup("pen", (value) => {
    app.selectedPenName = value;
    app.penTool = app.penTools[value];
    persist();
  });

  sizeRange.addEventListener("input", (event) => {
    const value = Number((event.currentTarget as HTMLInputElement).value);
    applySize(value);
  });

  colorPicker.addEventListener("input", (event) => {
    const value = (event.currentTarget as HTMLInputElement).value;
    applyColor(value);
  });

  byId<HTMLInputElement>("rainbow_mode").addEventListener("change", (event) => {
    app.isRainbowMode = (event.currentTarget as HTMLInputElement).checked;
    persist();
  });

  byId<HTMLInputElement>("auto_mode").addEventListener("change", (event) => {
    app.isAutoMode = (event.currentTarget as HTMLInputElement).checked;
    persist();
  });

  symmetryMode.addEventListener("change", (event) => {
    app.isSymmetryMode = (event.currentTarget as HTMLInputElement).checked;
    updateSymmetryControlsState();
    persist();
  });

  symmetryHud.addEventListener("change", (event) => {
    app.isSymmetryHudVisible = (event.currentTarget as HTMLInputElement).checked;
    persist();
  });

  symmetryType.addEventListener("change", (event) => {
    app.symmetryType = ((event.currentTarget as HTMLSelectElement).value === "mirror"
      ? "mirror"
      : "rotate");
    persist();
  });

  symmetryCount.addEventListener("change", (event) => {
    const value = Number((event.currentTarget as HTMLSelectElement).value);
    app.symmetryCount = [2, 4, 6, 8].includes(value) ? value : 4;
    persist();
  });

  symmetryOriginX.addEventListener("input", (event) => {
    applySymmetryOriginX(Number((event.currentTarget as HTMLInputElement).value));
  });

  symmetryOriginY.addEventListener("input", (event) => {
    applySymmetryOriginY(Number((event.currentTarget as HTMLInputElement).value));
  });

  symmetryOriginXReset.addEventListener("click", () => {
    applySymmetryOriginX(50);
  });

  symmetryOriginYReset.addEventListener("click", () => {
    applySymmetryOriginY(50);
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
      drawWithSymmetry(event.pageX, event.pageY);
      app.didDrawInStroke = true;
    }
  });

  canvas.addEventListener("pointerdown", (event) => {
    app.isDown = true;
    app.didDrawInStroke = false;
    setPointerPosition(event);
    drawWithSymmetry(event.pageX, event.pageY);
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
  applyColor(safeSettings.colorHex);

  byId<HTMLInputElement>("rainbow_mode").checked = safeSettings.rainbowMode;
  app.isRainbowMode = safeSettings.rainbowMode;

  byId<HTMLInputElement>("fade_mode").checked = safeSettings.fadeMode;
  app.isFadeMode = safeSettings.fadeMode;

  byId<HTMLInputElement>("auto_mode").checked = safeSettings.autoMode;
  app.isAutoMode = safeSettings.autoMode;

  symmetryMode.checked = safeSettings.symmetryMode;
  app.isSymmetryMode = safeSettings.symmetryMode;
  symmetryHud.checked = safeSettings.symmetryHud;
  app.isSymmetryHudVisible = safeSettings.symmetryHud;
  symmetryType.value = safeSettings.symmetryType;
  app.symmetryType = safeSettings.symmetryType;
  symmetryCount.value = String(safeSettings.symmetryCount);
  app.symmetryCount = [2, 4, 6, 8].includes(safeSettings.symmetryCount) ? safeSettings.symmetryCount : 4;
  applySymmetryOriginX(safeSettings.symmetryOriginX);
  applySymmetryOriginY(safeSettings.symmetryOriginY);

  exportScale.value = String(safeSettings.exportScale);
  exportTransparent.checked = safeSettings.exportTransparent;

  updateSymmetryControlsState();
  refreshUndoRedoButtons();
}
