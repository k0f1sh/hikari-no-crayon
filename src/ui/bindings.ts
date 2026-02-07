import { app, requireCanvas } from "../core/state";
import { applyDrawCompositeOperation, clear, reverseImage } from "../core/draw";
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
  const dockShowButton = byId<HTMLButtonElement>("dock_show_button");
  const dockHideButton = byId<HTMLButtonElement>("dock_hide_button");
  const menu = byId<HTMLElement>("menu");
  const dock = byId<HTMLElement>("bottom_dock");
  const sizeRange = byId<HTMLInputElement>("dock_size_range");
  const sizeDockValue = byId<HTMLElement>("size_dock_value");
  const penDockValue = byId<HTMLElement>("pen_dock_value");
  const modeDockValue = byId<HTMLElement>("mode_dock_value");
  const yamiDockValue = byId<HTMLElement>("yami_dock_value");
  const symmetryDockValue = byId<HTMLElement>("symmetry_dock_value");
  const colorPicker = byId<HTMLInputElement>("dock_color_picker");
  const undoButton = byId<HTMLElement>("undo_button");
  const redoButton = byId<HTMLElement>("redo_button");
  const rainbowMode = byId<HTMLInputElement>("rainbow_mode");
  const rainbowSaturation = byId<HTMLInputElement>("rainbow_saturation");
  const rainbowSaturationValue = byId<HTMLElement>("rainbow_saturation_value");
  const rainbowBrightness = byId<HTMLInputElement>("rainbow_brightness");
  const rainbowBrightnessValue = byId<HTMLElement>("rainbow_brightness_value");
  const fadeMode = byId<HTMLInputElement>("fade_mode");
  const autoMode = byId<HTMLInputElement>("auto_mode");
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
  const yamiMode = byId<HTMLInputElement>("yami_mode");
  const yamiStrength = byId<HTMLInputElement>("yami_strength");
  const yamiStrengthValue = byId<HTMLElement>("yami_strength_value");
  const recordButton = byId<HTMLElement>("record_button");
  const recordStatus = byId<HTMLElement>("record_status");

  const persist = () => {
    const settings: PersistedSettings = {
      pen: app.selectedPenName,
      size: app.penSize,
      colorHex: rgbToHex(app.penColor),
      rainbowMode: app.isRainbowMode,
      rainbowSaturation: app.rainbowSaturation,
      rainbowBrightness: app.rainbowBrightness,
      fadeMode: app.isFadeMode,
      autoMode: app.isAutoMode,
      yamiMode: app.isYamiMode,
      yamiStrength: app.yamiStrength,
      symmetryMode: app.isSymmetryMode,
      symmetryHud: app.isSymmetryHudVisible,
      symmetryType: app.symmetryType,
      symmetryCount: app.symmetryCount,
      symmetryOriginX: Math.round(app.symmetryOriginX * 100),
      symmetryOriginY: Math.round(app.symmetryOriginY * 100),
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

  const applyYamiStrength = (value: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(value)));
    app.yamiStrength = clamped;
    yamiStrength.value = String(clamped);
    yamiStrengthValue.textContent = String(clamped);
    updateYamiDockValue();
    persist();
  };

  const updateYamiControlsState = () => {
    const disabled = !app.isYamiMode;
    yamiStrength.disabled = disabled;
    yamiStrength.closest("label")?.classList.toggle("is-disabled", disabled);
  };

  const updateRainbowControlsState = () => {
    const disabled = !app.isRainbowMode;
    rainbowSaturation.disabled = disabled;
    rainbowBrightness.disabled = disabled;
    rainbowSaturation.closest("label")?.classList.toggle("is-disabled", disabled);
    rainbowBrightness.closest("label")?.classList.toggle("is-disabled", disabled);
  };

  const applyRainbowSaturation = (value: number) => {
    const clamped = Math.max(0, Math.min(255, Math.round(value)));
    app.rainbowSaturation = clamped;
    rainbowSaturation.value = String(clamped);
    rainbowSaturationValue.textContent = String(clamped);
    persist();
  };

  const applyRainbowBrightness = (value: number) => {
    const clamped = Math.max(0, Math.min(255, Math.round(value)));
    app.rainbowBrightness = clamped;
    rainbowBrightness.value = String(clamped);
    rainbowBrightnessValue.textContent = String(clamped);
    persist();
  };

  const updateModeDockValue = () => {
    const activeModes: string[] = [];
    if (app.isRainbowMode) {
      activeModes.push("R");
    }
    if (app.isFadeMode) {
      activeModes.push("F");
    }
    if (app.isAutoMode) {
      activeModes.push("A");
    }
    modeDockValue.textContent = activeModes.length > 0 ? activeModes.join("+") : "OFF";
    modeDockButton?.classList.toggle("is-on-state", activeModes.length > 0);
  };

  const updateYamiDockValue = () => {
    yamiDockValue.textContent = app.isYamiMode ? `ON ${app.yamiStrength}` : "OFF";
    yamiDockButton?.classList.toggle("is-on-state", app.isYamiMode);
  };

  const updateSymmetryDockValue = () => {
    if (!app.isSymmetryMode) {
      symmetryDockValue.textContent = "OFF";
      symmetryDockButton?.classList.remove("is-on-state");
      return;
    }
    const typeLabel = app.symmetryType === "mirror" ? "M" : "R";
    symmetryDockValue.textContent = `${typeLabel}${app.symmetryCount}`;
    symmetryDockButton?.classList.add("is-on-state");
  };

  const commitHistory = () => {
    captureHistorySnapshot();
    refreshUndoRedoButtons();
  };

  const applySize = (value: number) => {
    app.penSize = Math.max(5, Math.min(400, value));
    sizeRange.value = String(app.penSize);
    sizeDockValue.textContent = `${app.penSize}px`;
    persist();
  };

  const applyColor = (hex: string) => {
    app.penColor = colorFromSettings(hex);
    const colorHex = rgbToHex(app.penColor);
    colorPicker.value = colorHex;
    persist();
  };

  const dockButtons = Array.from(dock.querySelectorAll<HTMLButtonElement>(".dock_btn"));
  const modeDockButton = dock.querySelector<HTMLButtonElement>('.dock_btn[data-panel="ml"]');
  const yamiDockButton = dock.querySelector<HTMLButtonElement>('.dock_btn[data-panel="yh"]');
  const symmetryDockButton = dock.querySelector<HTMLButtonElement>('.dock_btn[data-panel="sy"]');
  const panelIds = ["pl", "ml", "yh", "sy", "etc"];
  const panels = panelIds.reduce<Record<string, HTMLElement>>((acc, id) => {
    acc[id] = byId<HTMLElement>(id);
    return acc;
  }, {});
  let activePanelId: string | null = null;
  let isDockVisible = true;

  const closePanels = () => {
    panelIds.forEach((id) => {
      panels[id].style.display = "none";
    });
    dockButtons.forEach((button) => {
      button.classList.remove("is-active");
    });
    activePanelId = null;
    menu.style.display = "none";
  };

  const setActivePanel = (panelId: string) => {
    activePanelId = panelId;
    menu.style.display = "";
    panelIds.forEach((id) => {
      panels[id].style.display = id === panelId ? "" : "none";
    });

    dockButtons.forEach((button) => {
      button.classList.toggle("is-active", button.dataset.panel === panelId);
    });
  };

  dockButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const panelId = button.dataset.panel;
      if (!panelId || !panels[panelId]) {
        return;
      }
      if (activePanelId === panelId) {
        closePanels();
        return;
      }
      setActivePanel(panelId);
    });
  });

  const panelCloseButtons = Array.from(menu.querySelectorAll<HTMLButtonElement>(".panel_close"));
  panelCloseButtons.forEach((button) => {
    button.addEventListener("click", () => {
      closePanels();
    });
  });

  document.addEventListener("pointerdown", (event) => {
    if (!activePanelId) {
      return;
    }
    const target = event.target as Node | null;
    if (!target) {
      return;
    }
    if (menu.contains(target)) {
      return;
    }
    closePanels();
  });

  const applyDockVisibility = (visible: boolean) => {
    isDockVisible = visible;
    dock.style.display = visible ? "" : "none";
    dockShowButton.style.display = visible ? "none" : "block";
    if (!visible) {
      closePanels();
    }
  };

  dockHideButton.addEventListener("click", () => {
    applyDockVisibility(false);
  });

  dockShowButton.addEventListener("click", () => {
    applyDockVisibility(true);
  });

  const penGroup = setupRadioGroup("pen", (value) => {
    app.selectedPenName = value;
    app.penTool = app.penTools[value];
    const selectedPenInput = document.querySelector<HTMLInputElement>(`input[name=pen][value="${value}"]`);
    const selectedPenName = selectedPenInput?.closest("label")?.querySelector<HTMLElement>(".pen_name")
      ?.textContent;
    penDockValue.textContent = selectedPenName ?? value;
    closePanels();
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

  rainbowMode.addEventListener("change", (event) => {
    app.isRainbowMode = (event.currentTarget as HTMLInputElement).checked;
    updateRainbowControlsState();
    updateModeDockValue();
    persist();
  });

  rainbowSaturation.addEventListener("input", (event) => {
    applyRainbowSaturation(Number((event.currentTarget as HTMLInputElement).value));
  });

  rainbowBrightness.addEventListener("input", (event) => {
    applyRainbowBrightness(Number((event.currentTarget as HTMLInputElement).value));
  });

  autoMode.addEventListener("change", (event) => {
    app.isAutoMode = (event.currentTarget as HTMLInputElement).checked;
    updateModeDockValue();
    persist();
  });

  yamiMode.addEventListener("change", (event) => {
    app.isYamiMode = (event.currentTarget as HTMLInputElement).checked;
    updateYamiControlsState();
    updateYamiDockValue();
    applyDrawCompositeOperation();
    persist();
  });

  yamiStrength.addEventListener("input", (event) => {
    applyYamiStrength(Number((event.currentTarget as HTMLInputElement).value));
  });

  symmetryMode.addEventListener("change", (event) => {
    app.isSymmetryMode = (event.currentTarget as HTMLInputElement).checked;
    updateSymmetryControlsState();
    updateSymmetryDockValue();
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
    updateSymmetryDockValue();
    persist();
  });

  symmetryCount.addEventListener("change", (event) => {
    const value = Number((event.currentTarget as HTMLSelectElement).value);
    app.symmetryCount = [2, 4, 6, 8, 16, 32].includes(value) ? value : 4;
    updateSymmetryDockValue();
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

  fadeMode.addEventListener("change", (event) => {
    app.isFadeMode = (event.currentTarget as HTMLInputElement).checked;
    updateModeDockValue();
    persist();
  });

  byId<HTMLElement>("clear_button").addEventListener("click", () => {
    clear(app.c!);
    app.effects = [];
    commitHistory();
    closePanels();
  });

  byId<HTMLElement>("reverse_button").addEventListener("click", () => {
    reverseImage();
    commitHistory();
    closePanels();
  });

  byId<HTMLElement>("save_button").addEventListener("click", () => {
    exportPng({
      scale: 1,
    });
  });

  let isRecording = false;
  let recordTicker: number | null = null;

  const setRecordingStatusText = (secondsLeft: number) => {
    recordStatus.textContent = `● 録画中 ${secondsLeft}s`;
  };

  const clearRecordingTicker = () => {
    if (recordTicker !== null) {
      window.clearInterval(recordTicker);
      recordTicker = null;
    }
  };

  const setRecordingState = (recording: boolean) => {
    isRecording = recording;
    recordButton.classList.toggle("is-disabled", recording);
    recordButton.setAttribute("aria-disabled", String(recording));
    recordButton.textContent = recording ? "録画中..." : "10秒録画";
    recordStatus.classList.toggle("is-visible", recording);
    if (!recording) {
      clearRecordingTicker();
    }
  };

  recordButton.addEventListener("click", (event) => {
    event.preventDefault();
    if (isRecording) {
      return;
    }
    if (typeof MediaRecorder === "undefined") {
      window.alert("このブラウザは録画に対応していません。");
      return;
    }

    const canvas = requireCanvas();
    if (typeof canvas.captureStream !== "function") {
      window.alert("このブラウザは録画に対応していません。");
      return;
    }

    const stream = canvas.captureStream(60);
    const optionsList = [
      "video/webm;codecs=vp9",
      "video/webm;codecs=vp8",
      "video/webm",
    ];
    const mimeType = optionsList.find((type) => MediaRecorder.isTypeSupported(type));
    const recorder = mimeType
      ? new MediaRecorder(stream, { mimeType })
      : new MediaRecorder(stream);
    const chunks: BlobPart[] = [];

    setRecordingState(true);
    setRecordingStatusText(10);
    const startedAt = Date.now();
    recordTicker = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const remaining = Math.max(0, 10 - elapsed);
      setRecordingStatusText(remaining);
    }, 200);
    closePanels();

    recorder.addEventListener("dataavailable", (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data);
      }
    });

    recorder.addEventListener("stop", () => {
      stream.getTracks().forEach((track) => {
        track.stop();
      });

      const blob = new Blob(chunks, { type: recorder.mimeType || "video/webm" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      link.href = url;
      link.download = `hikari-no-crayon-${timestamp}.webm`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setRecordingState(false);
    });

    recorder.addEventListener("error", () => {
      stream.getTracks().forEach((track) => {
        track.stop();
      });
      setRecordingState(false);
      window.alert("録画に失敗しました。");
    });

    recorder.start(250);
    window.setTimeout(() => {
      if (recorder.state !== "inactive") {
        recorder.stop();
      }
    }, 10_000);
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
    applyDrawCompositeOperation();
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

  applyDockVisibility(true);
  penGroup.selectByValue(safeSettings.pen) || penGroup.selectByValue(defaultPersistedSettings.pen);
  closePanels();
  applySize(safeSettings.size);
  applyColor(safeSettings.colorHex);

  rainbowMode.checked = safeSettings.rainbowMode;
  app.isRainbowMode = safeSettings.rainbowMode;
  applyRainbowSaturation(safeSettings.rainbowSaturation);
  applyRainbowBrightness(safeSettings.rainbowBrightness);
  updateRainbowControlsState();

  fadeMode.checked = safeSettings.fadeMode;
  app.isFadeMode = safeSettings.fadeMode;

  autoMode.checked = safeSettings.autoMode;
  app.isAutoMode = safeSettings.autoMode;

  yamiMode.checked = safeSettings.yamiMode;
  app.isYamiMode = safeSettings.yamiMode;
  applyYamiStrength(safeSettings.yamiStrength);
  updateYamiControlsState();
  applyDrawCompositeOperation();

  symmetryMode.checked = safeSettings.symmetryMode;
  app.isSymmetryMode = safeSettings.symmetryMode;
  symmetryHud.checked = safeSettings.symmetryHud;
  app.isSymmetryHudVisible = safeSettings.symmetryHud;
  symmetryType.value = safeSettings.symmetryType;
  app.symmetryType = safeSettings.symmetryType;
  symmetryCount.value = String(safeSettings.symmetryCount);
  app.symmetryCount = [2, 4, 6, 8, 16, 32].includes(safeSettings.symmetryCount)
    ? safeSettings.symmetryCount
    : 4;
  applySymmetryOriginX(safeSettings.symmetryOriginX);
  applySymmetryOriginY(safeSettings.symmetryOriginY);

  updateSymmetryControlsState();
  updateModeDockValue();
  updateYamiDockValue();
  updateSymmetryDockValue();
  refreshUndoRedoButtons();
}
