import { app, requireCanvas, requireHudContext } from "../core/state";
import { applyDrawCompositeOperation, clear, reverseImage } from "../core/draw";
import { rgbToHex } from "../core/color";
import {
  extractSvgPathDataList,
  fitPointsToCanvas,
  sampleSvgPathPoints,
} from "../core/svgPathTrace";
import { parseTurtleProgram } from "../core/turtleParse";
import { iterateTurtleProgram } from "../core/turtleExecute";
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
import {
  normalizePenCustomParams,
  penCustomParamCatalog,
  type PenCustomNumberParamDefinition,
  type PenCustomParamDefinition,
} from "../core/penCustomParams";
import { exportPng } from "../core/export";
import { PEN_CATALOG } from "../tools/penCatalog";
import { startPreviewAnimations, stopPreviewAnimations } from "./presetPreview";

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

const PEN_CUSTOM_CONTROLS_ID = "pen_custom_controls";

function ensurePenOptions(): void {
  const penList = document.getElementById("pl");
  if (!penList) {
    return;
  }

  for (const pen of PEN_CATALOG) {
    const existing = penList.querySelector<HTMLInputElement>(`input[name="pen"][value="${pen.value}"]`);
    if (existing) {
      continue;
    }

    const item = document.createElement("li");
    const label = document.createElement("label");
    label.className = "pen_option";

    const input = document.createElement("input");
    input.type = "radio";
    input.name = "pen";
    input.value = pen.value;

    const icon = document.createElement("span");
    icon.className = "pen_icon";
    icon.textContent = pen.icon;

    const name = document.createElement("span");
    name.className = "pen_name";
    name.textContent = pen.name;

    label.appendChild(input);
    label.appendChild(icon);
    label.appendChild(name);
    item.appendChild(label);
    penList.appendChild(item);
  }
}

export function bindUiEvents(): void {
  ensurePenOptions();

  const dockShowButton = byId<HTMLButtonElement>("dock_show_button");
  const simpleSettingsButton = byId<HTMLButtonElement>("simple_settings_button");
  const simpleSettingsModal = byId<HTMLElement>("simple_settings_modal");
  const simpleSettingsCloseButton = byId<HTMLButtonElement>("simple_settings_close_button");
  const rainbowMenuButton = byId<HTMLButtonElement>("rainbow_menu_button");
  const yamiMenuButton = byId<HTMLButtonElement>("yami_menu_button");
  const symmetryMenuButton = byId<HTMLButtonElement>("symmetry_menu_button");
  const dockHideButton = byId<HTMLButtonElement>("dock_hide_button");
  const menu = byId<HTMLElement>("menu");
  const dock = byId<HTMLElement>("bottom_dock");
  const sizeRange = byId<HTMLInputElement>("dock_size_range");
  const sizeDockValue = byId<HTMLElement>("size_dock_value");
  const penDockValue = byId<HTMLElement>("pen_dock_value");
  const rainbowDockValue = byId<HTMLElement>("rainbow_dock_value");
  const fadeDockValue = byId<HTMLElement>("fade_dock_value");
  const autoDockValue = byId<HTMLElement>("auto_dock_value");
  const yamiDockValue = byId<HTMLElement>("yami_dock_value");
  const symmetryDockValue = byId<HTMLElement>("symmetry_dock_value");
  const dockFadeToggleButton = byId<HTMLButtonElement>("dock_fade_toggle_button");
  const dockAutoToggleButton = byId<HTMLButtonElement>("dock_auto_toggle_button");
  const colorPicker = byId<HTMLInputElement>("dock_color_picker");
  const undoButton = byId<HTMLElement>("undo_button");
  const redoButton = byId<HTMLElement>("redo_button");
  const dockUndoButton = byId<HTMLButtonElement>("dock_undo_button");
  const dockRedoButton = byId<HTMLButtonElement>("dock_redo_button");
  const dockClearButton = byId<HTMLButtonElement>("dock_clear_button");
  const rainbowSaturation = byId<HTMLInputElement>("rainbow_saturation");
  const rainbowSaturationValue = byId<HTMLElement>("rainbow_saturation_value");
  const rainbowBrightness = byId<HTMLInputElement>("rainbow_brightness");
  const rainbowBrightnessValue = byId<HTMLElement>("rainbow_brightness_value");
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
  const yamiStrength = byId<HTMLInputElement>("yami_strength");
  const yamiStrengthValue = byId<HTMLElement>("yami_strength_value");
  const recordPresetInput = byId<HTMLSelectElement>("record_preset");
  const recordSecondsInput = byId<HTMLInputElement>("record_seconds");
  const recordFpsInput = byId<HTMLInputElement>("record_fps");
  const recordResolutionInput = byId<HTMLSelectElement>("record_resolution");
  const recordQualityInput = byId<HTMLSelectElement>("record_quality");
  const recordButton = byId<HTMLElement>("record_button");
  const svgPathInput = byId<HTMLTextAreaElement>("svg_path_input");
  const svgPathStepInput = byId<HTMLInputElement>("svg_path_step");
  const svgPathFitInput = byId<HTMLInputElement>("svg_path_fit");
  const svgPathSpeedInput = byId<HTMLSelectElement>("svg_path_speed");
  const svgPathDrawButton = byId<HTMLButtonElement>("svg_path_draw_button");
  const resetSettingsButton = byId<HTMLElement>("reset_settings_button");
  const recordStatus = byId<HTMLElement>("record_status");
  const recordFrameHud = byId<HTMLElement>("record_frame_hud");
  const recordFrameHudLabel = byId<HTMLElement>("record_frame_hud_label");
  const penCustomControls = byId<HTMLElement>(PEN_CUSTOM_CONTROLS_ID);
  const simplePresetButtons = Array.from(
    document.querySelectorAll<HTMLButtonElement>(".simple_preset_button"),
  );
  let shouldPersist = true;

  const ensurePenCustomValue = (penName: string, definition: PenCustomParamDefinition) => {
    const penParams = app.penCustomParams[penName] ?? {};
    if (typeof penParams !== "object" || !penParams) {
      app.penCustomParams[penName] = {};
    } else {
      app.penCustomParams[penName] = penParams;
    }

    if (!(definition.key in app.penCustomParams[penName])) {
      app.penCustomParams[penName][definition.key] = definition.defaultValue;
    }
  };

  const formatNumberValue = (definition: PenCustomNumberParamDefinition, value: number): string => {
    if (!Number.isFinite(definition.step) || definition.step >= 1) {
      return String(Math.round(value));
    }
    const decimals = Math.min(4, String(definition.step).split(".")[1]?.length ?? 2);
    return value.toFixed(decimals);
  };

  const renderPenCustomControls = (penName: string) => {
    penCustomControls.innerHTML = "";
    const definitions = penCustomParamCatalog[penName] ?? [];

    if (definitions.length === 0) {
      const empty = document.createElement("p");
      empty.className = "pen_custom_empty";
      empty.textContent = "このぺんは かすたむせってい なし";
      penCustomControls.appendChild(empty);
      return;
    }

    definitions.forEach((definition) => {
      ensurePenCustomValue(penName, definition);

      if (definition.type === "boolean") {
        const label = document.createElement("label");
        label.className = "export_label pen_custom_checkbox";

        const text = document.createElement("span");
        text.textContent = definition.label;

        const input = document.createElement("input");
        input.type = "checkbox";
        input.checked = app.penCustomParams[penName][definition.key] === true;
        input.addEventListener("change", () => {
          app.penCustomParams[penName][definition.key] = input.checked;
          persist();
        });

        label.appendChild(text);
        label.appendChild(input);
        penCustomControls.appendChild(label);
        return;
      }

      const label = document.createElement("label");
      label.className = "range_label";

      const title = document.createElement("span");
      title.textContent = definition.label;

      const input = document.createElement("input");
      input.type = "range";
      input.min = String(definition.min);
      input.max = String(definition.max);
      input.step = String(definition.step);
      const currentValue = Number(app.penCustomParams[penName][definition.key]);
      const safeValue = Number.isFinite(currentValue)
        ? Math.max(definition.min, Math.min(definition.max, currentValue))
        : definition.defaultValue;
      input.value = String(safeValue);

      const valueText = document.createElement("strong");
      valueText.className = "pen_custom_value";
      valueText.textContent = formatNumberValue(definition, safeValue);

      input.addEventListener("input", () => {
        const value = Number(input.value);
        const clamped = Number.isFinite(value) ? Math.max(definition.min, Math.min(definition.max, value)) : safeValue;
        app.penCustomParams[penName][definition.key] = clamped;
        valueText.textContent = formatNumberValue(definition, clamped);
        persist();
      });

      label.appendChild(title);
      label.appendChild(input);
      label.appendChild(valueText);
      penCustomControls.appendChild(label);
    });
  };

  const persist = () => {
    if (!shouldPersist) {
      return;
    }
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
      recordPreset: recordPresetInput.value,
      recordSeconds: Number(recordSecondsInput.value),
      recordFps: Number(recordFpsInput.value),
      recordResolution: recordResolutionInput.value,
      recordQuality: recordQualityInput.value,
      penCustomParams: app.penCustomParams,
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
    dockUndoButton.classList.toggle("is-disabled", !undoEnabled);
    dockRedoButton.classList.toggle("is-disabled", !redoEnabled);
    dockUndoButton.setAttribute("aria-disabled", String(!undoEnabled));
    dockRedoButton.setAttribute("aria-disabled", String(!redoEnabled));
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
    rainbowDockValue.textContent = app.isRainbowMode ? "🌈" : "◻";
    modeDockButton?.classList.toggle("is-on-state", app.isRainbowMode);
    fadeDockValue.textContent = app.isFadeMode ? "🌫️" : "◻";
    dockFadeToggleButton.classList.toggle("is-on-state", app.isFadeMode);
    autoDockValue.textContent = app.isAutoMode ? "🤖" : "◻";
    dockAutoToggleButton.classList.toggle("is-on-state", app.isAutoMode);
  };

  const updateYamiDockValue = () => {
    yamiDockValue.textContent = app.isYamiMode ? "🌑" : "◻";
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

  const updateSizeRangeTrack = () => {
    const min = Number(sizeRange.min);
    const max = Number(sizeRange.max);
    const value = Number(sizeRange.value);
    if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min || !Number.isFinite(value)) {
      sizeRange.style.setProperty("--size-range-progress", "0%");
      return;
    }
    const clamped = Math.max(min, Math.min(max, value));
    const progress = ((clamped - min) / (max - min)) * 100;
    sizeRange.style.setProperty("--size-range-progress", `${progress}%`);
  };

  const applySize = (value: number) => {
    app.penSize = Math.max(3, Math.min(300, value));
    sizeRange.value = String(app.penSize);
    sizeDockValue.textContent = `${app.penSize}px`;
    updateSizeRangeTrack();
    persist();
  };

  const applyColor = (hex: string) => {
    app.penColor = colorFromSettings(hex);
    const colorHex = rgbToHex(app.penColor);
    colorPicker.value = colorHex;
    persist();
  };

  const syncDockColorPreview = () => {
    if (!app.isRainbowMode) {
      return;
    }
    const currentHex = rgbToHex(app.penColor);
    if (colorPicker.value !== currentHex) {
      colorPicker.value = currentHex;
    }
  };

  type SimplePresetKey =
    "nijiiro"
    | "mangekyo"
    | "lifegame"
    | "futsu"
    | "bukimi"
    | "hane"
    | "yamispray"
    | "yamikeshi";
  type SimplePresetConfig = {
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

  const simplePresetConfigs: Record<SimplePresetKey, SimplePresetConfig> = {
    nijiiro: {
      pen: "normal_pen",
      size: 70,
      colorHex: "#56b1ff",
      rainbowMode: true,
      rainbowSaturation: 200,
      rainbowBrightness: 200,
      fadeMode: false,
      autoMode: false,
      yamiMode: false,
      yamiStrength: 100,
      symmetryMode: false,
      symmetryHud: false,
      symmetryType: "rotate",
      symmetryCount: 4,
      symmetryOriginX: 50,
      symmetryOriginY: 50,
    },
    mangekyo: {
      pen: "snow_pen",
      size: 45,
      colorHex: "#56b1ff",
      rainbowMode: true,
      rainbowSaturation: 160,
      rainbowBrightness: 100,
      fadeMode: true,
      autoMode: false,
      yamiMode: false,
      yamiStrength: 100,
      symmetryMode: true,
      symmetryHud: true,
      symmetryType: "rotate",
      symmetryCount: 8,
      symmetryOriginX: 50,
      symmetryOriginY: 50,
    },
    lifegame: {
      pen: "life_pen",
      size: 112,
      colorHex: "#56b1ff",
      rainbowMode: true,
      rainbowSaturation: 160,
      rainbowBrightness: 60,
      fadeMode: true,
      autoMode: false,
      yamiMode: false,
      yamiStrength: 100,
      symmetryMode: false,
      symmetryHud: false,
      symmetryType: "rotate",
      symmetryCount: 4,
      symmetryOriginX: 50,
      symmetryOriginY: 50,
      lifeSnapToGrid: false,
    },
    futsu: {
      pen: "normal_pen",
      size: 45,
      colorHex: "#56b1ff",
      rainbowMode: false,
      rainbowSaturation: 200,
      rainbowBrightness: 200,
      fadeMode: false,
      autoMode: false,
      yamiMode: false,
      yamiStrength: 100,
      symmetryMode: false,
      symmetryHud: false,
      symmetryType: "rotate",
      symmetryCount: 4,
      symmetryOriginX: 50,
      symmetryOriginY: 50,
    },
    bukimi: {
      pen: "blood_pen",
      size: 45,
      colorHex: "#ff3b4f",
      rainbowMode: false,
      rainbowSaturation: 200,
      rainbowBrightness: 200,
      fadeMode: false,
      autoMode: true,
      yamiMode: false,
      yamiStrength: 100,
      symmetryMode: false,
      symmetryHud: false,
      symmetryType: "rotate",
      symmetryCount: 4,
      symmetryOriginX: 50,
      symmetryOriginY: 50,
    },
    hane: {
      pen: "hane_pen",
      size: 70,
      colorHex: "#0f172f",
      rainbowMode: false,
      rainbowSaturation: 200,
      rainbowBrightness: 200,
      fadeMode: false,
      autoMode: false,
      yamiMode: false,
      yamiStrength: 100,
      symmetryMode: false,
      symmetryHud: false,
      symmetryType: "rotate",
      symmetryCount: 4,
      symmetryOriginX: 50,
      symmetryOriginY: 50,
    },
    yamispray: {
      pen: "spray_pen",
      size: 98,
      colorHex: "#56b1ff",
      rainbowMode: false,
      rainbowSaturation: 200,
      rainbowBrightness: 200,
      fadeMode: false,
      autoMode: false,
      yamiMode: true,
      yamiStrength: 100,
      symmetryMode: false,
      symmetryHud: false,
      symmetryType: "rotate",
      symmetryCount: 4,
      symmetryOriginX: 50,
      symmetryOriginY: 50,
    },
    yamikeshi: {
      pen: "normal_pen",
      size: 80,
      colorHex: "#56b1ff",
      rainbowMode: false,
      rainbowSaturation: 200,
      rainbowBrightness: 200,
      fadeMode: false,
      autoMode: false,
      yamiMode: true,
      yamiStrength: 100,
      symmetryMode: false,
      symmetryHud: false,
      symmetryType: "rotate",
      symmetryCount: 4,
      symmetryOriginX: 50,
      symmetryOriginY: 50,
    },
  };

  const isSimplePresetKey = (value: string): value is SimplePresetKey =>
    value === "nijiiro" || value === "mangekyo" || value === "lifegame" || value === "futsu"
    || value === "bukimi" || value === "hane" || value === "yamispray" || value === "yamikeshi";

  const closeSimpleSettingsModal = () => {
    simpleSettingsModal.classList.remove("is-open");
    simpleSettingsModal.setAttribute("aria-hidden", "true");
    stopPreviewAnimations();
  };

  const openSimpleSettingsModal = () => {
    simpleSettingsModal.classList.add("is-open");
    simpleSettingsModal.setAttribute("aria-hidden", "false");
    startPreviewAnimations(simplePresetButtons, simplePresetConfigs);
  };

  const applySimplePreset = (key: SimplePresetKey) => {
    const preset = simplePresetConfigs[key];
    if (!preset) {
      return;
    }

    penGroup.selectByValue(preset.pen) || penGroup.selectByValue(defaultPersistedSettings.pen);
    applySize(preset.size);
    applyColor(preset.colorHex);

    app.isRainbowMode = preset.rainbowMode;
    applyRainbowSaturation(preset.rainbowSaturation);
    applyRainbowBrightness(preset.rainbowBrightness);
    updateRainbowControlsState();

    app.isFadeMode = preset.fadeMode;
    app.isAutoMode = preset.autoMode;

    app.isYamiMode = preset.yamiMode;
    applyYamiStrength(preset.yamiStrength);
    updateYamiControlsState();

    symmetryMode.checked = preset.symmetryMode;
    app.isSymmetryMode = preset.symmetryMode;
    symmetryHud.checked = preset.symmetryHud;
    app.isSymmetryHudVisible = preset.symmetryHud;
    symmetryType.value = preset.symmetryType;
    app.symmetryType = preset.symmetryType;
    symmetryCount.value = String(preset.symmetryCount);
    app.symmetryCount = [2, 4, 6, 8, 16, 32].includes(preset.symmetryCount) ? preset.symmetryCount : 4;
    applySymmetryOriginX(preset.symmetryOriginX);
    applySymmetryOriginY(preset.symmetryOriginY);
    updateSymmetryControlsState();

    if (typeof preset.lifeSnapToGrid === "boolean") {
      const lifePenParams = app.penCustomParams.life_pen;
      app.penCustomParams.life_pen = {
        ...(typeof lifePenParams === "object" && lifePenParams ? lifePenParams : {}),
        snap_to_grid: preset.lifeSnapToGrid,
      };
      if (app.selectedPenName === "life_pen") {
        renderPenCustomControls("life_pen");
      }
    }

    applyDrawCompositeOperation();
    updateModeDockValue();
    updateYamiDockValue();
    updateSymmetryDockValue();
    persist();
    closeSimpleSettingsModal();
  };

  const dockButtons = Array.from(dock.querySelectorAll<HTMLButtonElement>(".dock_btn"));
  const modeDockButton = dock.querySelector<HTMLButtonElement>('.dock_btn[data-panel="ml"]');
  const yamiDockButton = dock.querySelector<HTMLButtonElement>('.dock_btn[data-panel="yh"]');
  const symmetryDockButton = dock.querySelector<HTMLButtonElement>('.dock_btn[data-panel="sy"]');
  const panelIds = ["pl", "pc", "ml", "yh", "sy", "etc"];
  const panels = panelIds.reduce<Record<string, HTMLElement>>((acc, id) => {
    acc[id] = byId<HTMLElement>(id);
    return acc;
  }, {});
  let activePanelId: string | null = null;
  let isDockVisible = true;

  const updateDockOffset = () => {
    const offset = isDockVisible ? Math.ceil(dock.getBoundingClientRect().height) + 8 : 0;
    document.documentElement.style.setProperty("--dock-offset", `${offset}px`);
  };

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

  const panelDockButtons = dockButtons.filter((button) => {
    const panelId = button.dataset.panel;
    return panelId && panelId !== "ml" && panelId !== "yh" && panelId !== "sy";
  });

  panelDockButtons.forEach((button) => {
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
    if (dock.contains(target)) {
      return;
    }
    closePanels();
  });

  const applyDockVisibility = (visible: boolean) => {
    isDockVisible = visible;
    dock.style.display = visible ? "" : "none";
    dockShowButton.style.display = visible ? "none" : "grid";
    updateDockOffset();
    if (!visible) {
      closePanels();
    }
  };

  if (typeof ResizeObserver !== "undefined") {
    const dockResizeObserver = new ResizeObserver(() => {
      updateDockOffset();
    });
    dockResizeObserver.observe(dock);
  }

  window.addEventListener("resize", updateDockOffset);
  updateDockOffset();

  dockHideButton.addEventListener("click", () => {
    applyDockVisibility(false);
  });

  dockShowButton.addEventListener("click", () => {
    applyDockVisibility(true);
  });

  simpleSettingsButton.addEventListener("click", () => {
    openSimpleSettingsModal();
  });

  simpleSettingsCloseButton.addEventListener("click", () => {
    closeSimpleSettingsModal();
  });

  simpleSettingsModal.addEventListener("pointerdown", (event) => {
    if (event.target === simpleSettingsModal) {
      closeSimpleSettingsModal();
    }
  });

  simplePresetButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.simplePreset;
      if (!key || !isSimplePresetKey(key)) {
        return;
      }
      applySimplePreset(key);
    });
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && simpleSettingsModal.classList.contains("is-open")) {
      closeSimpleSettingsModal();
    }
  });

  const renderPenDockValue = (value: string): void => {
    const selectedPenInput = document.querySelector<HTMLInputElement>(`input[name=pen][value="${value}"]`);
    const label = selectedPenInput?.closest("label");
    const icon = label?.querySelector<HTMLElement>(".pen_icon")?.textContent?.trim();
    const name = label?.querySelector<HTMLElement>(".pen_name")?.textContent?.trim() ?? value;
    penDockValue.classList.add("dock_pen_label");
    penDockValue.replaceChildren();

    if (icon) {
      const iconEl = document.createElement("span");
      iconEl.className = "dock_pen_icon_text";
      iconEl.textContent = icon;
      penDockValue.appendChild(iconEl);
    }

    const nameEl = document.createElement("span");
    nameEl.className = "dock_pen_name_text";
    nameEl.textContent = name;
    penDockValue.appendChild(nameEl);
  };

  const penGroup = setupRadioGroup("pen", (value) => {
    app.selectedPenName = value;
    app.penTool = app.penTools[value]
      ?? app.penTools[defaultPersistedSettings.pen]
      ?? Object.values(app.penTools)[0]
      ?? null;
    renderPenCustomControls(value);
    renderPenDockValue(value);
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

  rainbowSaturation.addEventListener("input", (event) => {
    applyRainbowSaturation(Number((event.currentTarget as HTMLInputElement).value));
  });

  rainbowBrightness.addEventListener("input", (event) => {
    applyRainbowBrightness(Number((event.currentTarget as HTMLInputElement).value));
  });


  modeDockButton?.addEventListener("click", () => {
    app.isRainbowMode = !app.isRainbowMode;
    updateRainbowControlsState();
    updateModeDockValue();
    if (!app.isRainbowMode && activePanelId === "ml") {
      closePanels();
    }
    persist();
  });

  dockFadeToggleButton.addEventListener("click", () => {
    app.isFadeMode = !app.isFadeMode;
    updateModeDockValue();
    persist();
  });

  dockAutoToggleButton.addEventListener("click", () => {
    app.isAutoMode = !app.isAutoMode;
    updateModeDockValue();
    persist();
  });

  rainbowMenuButton.addEventListener("click", (event) => {
    event.stopPropagation();
    if (activePanelId === "ml") {
      closePanels();
      return;
    }
    setActivePanel("ml");
  });

  yamiDockButton?.addEventListener("click", () => {
    app.isYamiMode = !app.isYamiMode;
    updateYamiControlsState();
    updateYamiDockValue();
    if (!app.isYamiMode && activePanelId === "yh") {
      closePanels();
    }
    applyDrawCompositeOperation();
    persist();
  });

  yamiStrength.addEventListener("input", (event) => {
    applyYamiStrength(Number((event.currentTarget as HTMLInputElement).value));
  });

  yamiMenuButton.addEventListener("click", (event) => {
    event.stopPropagation();
    if (activePanelId === "yh") {
      closePanels();
      return;
    }
    setActivePanel("yh");
  });

  symmetryDockButton?.addEventListener("click", () => {
    app.isSymmetryMode = !app.isSymmetryMode;
    symmetryMode.checked = app.isSymmetryMode;
    updateSymmetryControlsState();
    updateSymmetryDockValue();
    if (!app.isSymmetryMode && activePanelId === "sy") {
      closePanels();
    }
    persist();
  });

  symmetryMenuButton.addEventListener("click", (event) => {
    event.stopPropagation();
    if (activePanelId === "sy") {
      closePanels();
      return;
    }
    setActivePanel("sy");
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


  const clearCanvas = () => {
    clear(app.c!);
    app.effects = [];
    commitHistory();
    closePanels();
  };

  byId<HTMLElement>("clear_button").addEventListener("click", clearCanvas);
  dockClearButton.addEventListener("click", clearCanvas);

  byId<HTMLElement>("reverse_button").addEventListener("click", () => {
    reverseImage();
    commitHistory();
  });

  byId<HTMLElement>("save_button").addEventListener("click", () => {
    exportPng({
      scale: 1,
    });
  });

  const animateSvgTrace = (
    groups: Array<Array<{ x: number; y: number }>>,
    pointsPerFrame: number,
  ): Promise<void> =>
    new Promise((resolve) => {
      let groupIndex = 0;
      let pointIndex = 0;

      const drawFrame = () => {
        applyDrawCompositeOperation();
        let frameRemaining = pointsPerFrame;
        while (groupIndex < groups.length && frameRemaining > 0) {
          const group = groups[groupIndex];
          if (!group || pointIndex >= group.length) {
            groupIndex += 1;
            pointIndex = 0;
            continue;
          }

          const point = group[pointIndex];
          drawWithSymmetry(point.x, point.y);
          pointIndex += 1;
          frameRemaining -= 1;
        }

        if (groupIndex >= groups.length) {
          resolve();
          return;
        }
        window.requestAnimationFrame(drawFrame);
      };

      window.requestAnimationFrame(drawFrame);
    });

  const traceSvgPath = async () => {
    const pathDataList = extractSvgPathDataList(svgPathInput.value);
    if (pathDataList.length === 0) {
      window.alert("SVG path を入力してください。");
      return;
    }

    const stepValue = Number(svgPathStepInput.value);
    const step = Number.isFinite(stepValue) ? Math.max(0.5, Math.min(10, stepValue)) : 4;
    svgPathStepInput.value = String(step);
    const speedValue = Number.parseInt(svgPathSpeedInput.value, 10);
    const pointsPerFrame = [1, 2, 4, 8].includes(speedValue) ? speedValue : 1;
    svgPathSpeedInput.value = String(pointsPerFrame);

    try {
      const pointGroups: Array<Array<{ x: number; y: number }>> = [];
      pathDataList.forEach((pathData) => {
        try {
          const points = sampleSvgPathPoints(pathData, step);
          if (points.length > 0) {
            pointGroups.push(points);
          }
        } catch {
          // Skip malformed path segments and continue with valid ones.
        }
      });
      if (pointGroups.length === 0) {
        window.alert("有効な path を読み取れませんでした。");
        return;
      }

      let groupsToDraw = pointGroups;

      if (svgPathFitInput.checked) {
        const allPoints = pointGroups.flat();
        const fittedAllPoints = fitPointsToCanvas(allPoints, app.width, app.height, app.margin);
        let cursor = 0;
        groupsToDraw = pointGroups.map((group) => {
          const fittedGroup = fittedAllPoints.slice(cursor, cursor + group.length);
          cursor += group.length;
          return fittedGroup;
        });
      }

      closePanels();
      await animateSvgTrace(groupsToDraw, pointsPerFrame);

      app.didDrawInStroke = groupsToDraw.some((group) => group.length > 0);
      if (app.didDrawInStroke) {
        commitHistory();
        app.didDrawInStroke = false;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "SVG path の解析に失敗しました。";
      window.alert(message);
    }
  };

  const runSvgTrace = async () => {
    if (svgPathDrawButton.disabled) {
      return;
    }
    svgPathDrawButton.disabled = true;
    const originalText = svgPathDrawButton.textContent;
    svgPathDrawButton.textContent = "なぞりちゅう...";
    try {
      await traceSvgPath();
    } finally {
      svgPathDrawButton.disabled = false;
      svgPathDrawButton.textContent = originalText;
    }
  };

  svgPathDrawButton.addEventListener("click", (event) => {
    event.preventDefault();
    void runSvgTrace();
  });

  // Turtle Graphics
  const turtleModal = byId<HTMLElement>("turtle_modal");
  const turtleCloseButton = byId<HTMLButtonElement>("turtle_close_button");
  const turtleOpenButton = byId<HTMLButtonElement>("turtle_open_button");
  const turtleCodeInput = byId<HTMLTextAreaElement>("turtle_code_input");
  const turtleSpeedInput = byId<HTMLSelectElement>("turtle_speed");
  const turtleRunButton = byId<HTMLButtonElement>("turtle_run_button");
  const turtleShowCursor = byId<HTMLInputElement>("turtle_show_cursor");
  const turtleDensity = byId<HTMLInputElement>("turtle_density");
  const turtleDensityValue = byId<HTMLElement>("turtle_density_value");
  const turtleSampleSelect = byId<HTMLSelectElement>("turtle_sample");

  turtleDensity.addEventListener("input", () => {
    turtleDensityValue.textContent = turtleDensity.value;
  });

  const getTurtleSampleDimensions = () => {
    const width = Math.max(1, app.width || window.innerWidth || 1);
    const height = Math.max(1, app.height || window.innerHeight || 1);
    const min = Math.min(width, height);
    return { width, height, min };
  };

  const turtleSamples: Record<string, (dims: { width: number; height: number; min: number }) => string> = {
    square: ({ min }) => {
      const side = Math.max(40, Math.round(min * 0.22));
      return `repeat 4 [ fd ${side} rt 90 ]`;
    },
    circle: ({ min }) => {
      const step = Math.max(4, Math.round(min * 0.02));
      return `repeat 36 [ fd ${step} rt 10 ]`;
    },
    flower: ({ min }) => {
      const petalStep = Math.max(2, Math.round(min * 0.008));
      return `repeat 12 [ repeat 36 [ fd ${petalStep} rt 10 ] rt 30 ]`;
    },
    spiral: ({ min }) => {
      const turns = Math.min(120, Math.max(90, Math.round(min * 0.08)));
      const startLen = 1;
      const delta = Math.max(0.6, Math.round(min * 0.003 * 10) / 10);
      return [
        "to spiral [n len d] [",
        "  if n [",
        "    fd len",
        "    lt 59",
        "    call spiral [n-1 len+d d]",
        "  ] [",
        "    pu",
        "  ]",
        "]",
        "",
        `call spiral [${turns} ${startLen} ${delta}]`,
      ].join("\n");
    },
    snowflake: ({ min }) => {
      const arm = Math.max(36, Math.round(min * 0.14));
      const branch = Math.max(12, Math.round(arm / 3));
      return [
        "repeat 6 [",
        `  fd ${arm}`,
        `  repeat 6 [ bk ${branch} rt 60 fd ${branch} lt 60 ]`,
        `  bk ${arm}`,
        "  rt 60",
        "]",
      ].join("\n");
    },
    koch_recursive: ({ min }) => {
      const length = Math.max(90, Math.round(min * 0.38));
      return [
        "to koch [n len] [",
        "  if n [",
        "    call koch [n-1 len/3]",
        "    rt 60",
        "    call koch [n-1 len/3]",
        "    lt 120",
        "    call koch [n-1 len/3]",
        "    rt 60",
        "    call koch [n-1 len/3]",
        "  ] [",
        "    fd len",
        "  ]",
        "]",
        "",
        "repeat 3 [",
        `  call koch [4 ${length}]`,
        "  rt 120",
        "]",
      ].join("\n");
    },
    tree: ({ min }) => {
      const trunk = Math.max(48, Math.round(min * 0.16));
      const offset = Math.max(40, Math.round(min * 0.24));
      const depth = 5;
      return [
        "to tree [n len] [",
        "  if n [",
        "    fd len",
        "    rt 20",
        "    call tree [n-1 len*0.8]",
        "    lt 40",
        "    call tree [n-1 len*0.8]",
        "    rt 20",
        "    bk len",
        "  ] [",
        "  ]",
        "]",
        "",
        `pu bk ${offset} pd`,
        `call tree [${depth} ${trunk}]`,
      ].join("\n");
    },
  };

  turtleSampleSelect.addEventListener("change", () => {
    const key = turtleSampleSelect.value;
    if (key && turtleSamples[key]) {
      turtleCodeInput.value = turtleSamples[key](getTurtleSampleDimensions());
    }
  });

  const openTurtleModal = () => {
    turtleModal.classList.add("is-open");
    turtleModal.setAttribute("aria-hidden", "false");
  };

  const closeTurtleModal = () => {
    turtleModal.classList.remove("is-open");
    turtleModal.setAttribute("aria-hidden", "true");
  };

  turtleOpenButton.addEventListener("click", () => {
    if (isTurtleRunning) {
      stopTurtle();
      return;
    }
    openTurtleModal();
  });

  turtleCloseButton.addEventListener("click", () => {
    closeTurtleModal();
  });

  turtleModal.addEventListener("pointerdown", (event) => {
    if (event.target === turtleModal) {
      closeTurtleModal();
    }
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && turtleModal.classList.contains("is-open")) {
      closeTurtleModal();
    }
  });

  const drawTurtleCursor = (
    x: number,
    y: number,
    angleDeg: number,
    walkPhase: number,
    isMoving: boolean,
  ) => {
    const hud = requireHudContext();
    hud.clearRect(0, 0, app.width, app.height);
    hud.save();
    hud.translate(x, y);
    hud.rotate((angleDeg * Math.PI) / 180);

    const s = 18;
    const legSwing = isMoving ? Math.sin(walkPhase) * s * 0.1 : 0;
    const legLift = isMoving ? Math.cos(walkPhase) * s * 0.05 : 0;

    // shell
    hud.beginPath();
    hud.ellipse(0, 0, s * 0.7, s * 0.85, 0, 0, Math.PI * 2);
    hud.fillStyle = "rgba(80, 180, 100, 0.7)";
    hud.fill();
    hud.strokeStyle = "rgba(220, 255, 220, 0.9)";
    hud.lineWidth = 1.5;
    hud.stroke();

    // shell pattern
    hud.beginPath();
    hud.moveTo(-s * 0.35, s * 0.3);
    hud.lineTo(0, -s * 0.5);
    hud.lineTo(s * 0.35, s * 0.3);
    hud.strokeStyle = "rgba(40, 120, 60, 0.5)";
    hud.lineWidth = 1;
    hud.stroke();

    // head (forward = up in turtle space, which is -y before rotation)
    hud.beginPath();
    hud.arc(0, -s * 1.1, s * 0.35, 0, Math.PI * 2);
    hud.fillStyle = "rgba(100, 200, 120, 0.8)";
    hud.fill();
    hud.strokeStyle = "rgba(220, 255, 220, 0.9)";
    hud.lineWidth = 1.5;
    hud.stroke();

    // eyes
    hud.fillStyle = "rgba(20, 20, 20, 0.9)";
    hud.beginPath();
    hud.arc(-s * 0.12, -s * 1.2, 1.5, 0, Math.PI * 2);
    hud.fill();
    hud.beginPath();
    hud.arc(s * 0.12, -s * 1.2, 1.5, 0, Math.PI * 2);
    hud.fill();

    // legs
    const legPositions = [
      { lx: -s * 0.68, ly: -s * 0.42, phase: 1 },
      { lx: s * 0.68, ly: -s * 0.42, phase: -1 },
      { lx: -s * 0.68, ly: s * 0.42, phase: -1 },
      { lx: s * 0.68, ly: s * 0.42, phase: 1 },
    ];
    hud.fillStyle = "rgba(130, 220, 145, 0.92)";
    hud.strokeStyle = "rgba(40, 120, 60, 0.9)";
    hud.lineWidth = 1.2;
    for (const leg of legPositions) {
      hud.beginPath();
      hud.ellipse(
        leg.lx + legSwing * leg.phase,
        leg.ly + legLift * leg.phase,
        s * 0.24,
        s * 0.3,
        0,
        0,
        Math.PI * 2,
      );
      hud.fill();
      hud.stroke();
    }

    hud.restore();
  };

  const clearTurtleCursor = () => {
    const hud = requireHudContext();
    hud.clearRect(0, 0, app.width, app.height);
  };

  let turtleAbortController: AbortController | null = null;
  let isTurtleRunning = false;
  let turtleWalkPhase = 0;
  let turtleLastCursorPoint: { x: number; y: number } | null = null;

  const setTurtleRunning = (running: boolean) => {
    isTurtleRunning = running;
    turtleOpenButton.classList.toggle("is-turtle-running", running);
  };

  const animateTurtleTrace = (
    traceIterator: Generator<{ x: number; y: number; angle?: number; draw: boolean }, void, void>,
    pointsPerFrame: number,
    showCursor: boolean,
    signal: AbortSignal,
  ): Promise<boolean> =>
    new Promise((resolve) => {
      let hasAnyPoint = false;
      let finished = false;
      let hasDrawnPoint = false;

      const drawFrame = () => {
        if (signal.aborted) {
          if (showCursor) {
            clearTurtleCursor();
          }
          resolve(hasDrawnPoint);
          return;
        }

        applyDrawCompositeOperation();
        let frameRemaining = pointsPerFrame;
        let lastPoint: { x: number; y: number; angle?: number } | null = null;
        let movedDistanceInFrame = 0;

        while (!finished && frameRemaining > 0) {
          const next = traceIterator.next();
          if (next.done) {
            finished = true;
            break;
          }
          hasAnyPoint = true;
          const point = next.value;
          if (turtleLastCursorPoint) {
            movedDistanceInFrame += Math.hypot(
              point.x - turtleLastCursorPoint.x,
              point.y - turtleLastCursorPoint.y,
            );
          }
          turtleLastCursorPoint = { x: point.x, y: point.y };
          if (point.draw) {
            drawWithSymmetry(point.x, point.y);
            hasDrawnPoint = true;
          }
          lastPoint = point;
          frameRemaining -= 1;
        }

        if (showCursor && lastPoint) {
          if (movedDistanceInFrame > 0) {
            turtleWalkPhase += movedDistanceInFrame * 0.18;
          }
          drawTurtleCursor(lastPoint.x, lastPoint.y, lastPoint.angle ?? 0, turtleWalkPhase, movedDistanceInFrame > 0);
        }

        if (finished) {
          if (showCursor) {
            clearTurtleCursor();
          }
          if (!hasAnyPoint) {
            window.alert("びょうがする てんが ありません");
          }
          resolve(hasDrawnPoint);
          return;
        }
        window.requestAnimationFrame(drawFrame);
      };

      window.requestAnimationFrame(drawFrame);
    });

  const stopTurtle = () => {
    if (turtleAbortController) {
      turtleAbortController.abort();
      turtleAbortController = null;
    }
    turtleLastCursorPoint = null;
  };

  const runTurtle = async () => {
    if (isTurtleRunning) {
      stopTurtle();
      return;
    }
    const source = turtleCodeInput.value.trim();
    if (!source) {
      window.alert("こーどをにゅうりょくしてください");
      return;
    }

    turtleRunButton.textContent = "とめる";
    setTurtleRunning(true);
    turtleWalkPhase = 0;
    turtleLastCursorPoint = null;
    turtleAbortController = new AbortController();
    const { signal } = turtleAbortController;

    try {
      const program = parseTurtleProgram(source);
      const startX = app.width / 2;
      const startY = app.height / 2;
      const speedValue = Number.parseInt(turtleSpeedInput.value, 10);
      const pointsPerFrame = [1, 2, 4, 8].includes(speedValue) ? speedValue : 2;
      const densityValue = Math.max(1, Math.min(30, Number(turtleDensity.value) || 29));
      const stepSize = 31 - densityValue;
      const traceIterator = iterateTurtleProgram(program, { startX, startY, stepSize });

      const showCursor = turtleShowCursor.checked;

      closeTurtleModal();
      const didDraw = await animateTurtleTrace(traceIterator, pointsPerFrame, showCursor, signal);
      if (didDraw) {
        commitHistory();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "たーとるの じっこうに しっぱいしました";
      window.alert(message);
    } finally {
      turtleAbortController = null;
      turtleRunButton.textContent = "じっこう";
      setTurtleRunning(false);
    }
  };

  turtleRunButton.addEventListener("click", (event) => {
    event.preventDefault();
    void runTurtle();
  });

  let isRecording = false;
  let recordTicker: number | null = null;
  let durationSeconds = 10;
  type RecordPresetKey = "standard" | "short_standard" | "short_light" | "custom";
  type RecordFormValues = {
    seconds: number;
    fps: number;
    resolution: string;
    quality: string;
  };

  const recordPresetConfigs: Record<Exclude<RecordPresetKey, "custom">, RecordFormValues> = {
    standard: {
      seconds: 10,
      fps: 60,
      resolution: "source",
      quality: "auto",
    },
    short_standard: {
      seconds: 15,
      fps: 30,
      resolution: "1080x1920",
      quality: "10000000",
    },
    short_light: {
      seconds: 15,
      fps: 30,
      resolution: "720x1280",
      quality: "5000000",
    },
  };

  const defaultRecordSettings = {
    preset: defaultPersistedSettings.recordPreset as RecordPresetKey,
    seconds: defaultPersistedSettings.recordSeconds,
    fps: defaultPersistedSettings.recordFps,
    resolution: defaultPersistedSettings.recordResolution,
    quality: defaultPersistedSettings.recordQuality,
  };

  const clampNumber = (value: number, min: number, max: number, fallback: number): number => {
    if (!Number.isFinite(value)) {
      return fallback;
    }
    return Math.max(min, Math.min(max, Math.round(value)));
  };

  const hasOption = (select: HTMLSelectElement, value: string): boolean =>
    Array.from(select.options).some((option) => option.value === value);

  const sanitizePreset = (value: string): RecordPresetKey => {
    if (value === "standard" || value === "short_standard" || value === "short_light" || value === "custom") {
      return value;
    }
    return "standard";
  };

  const getRecordFormValues = (): RecordFormValues => {
    const seconds = clampNumber(Number(recordSecondsInput.value), 1, 120, defaultRecordSettings.seconds);
    const fps = clampNumber(Number(recordFpsInput.value), 1, 60, defaultRecordSettings.fps);
    const resolution = hasOption(recordResolutionInput, recordResolutionInput.value)
      ? recordResolutionInput.value
      : defaultRecordSettings.resolution;
    const quality = hasOption(recordQualityInput, recordQualityInput.value)
      ? recordQualityInput.value
      : defaultRecordSettings.quality;

    return { seconds, fps, resolution, quality };
  };

  const applyRecordFormValues = (values: RecordFormValues) => {
    const normalized: RecordFormValues = {
      seconds: clampNumber(values.seconds, 1, 120, defaultRecordSettings.seconds),
      fps: clampNumber(values.fps, 1, 60, defaultRecordSettings.fps),
      resolution: hasOption(recordResolutionInput, values.resolution)
        ? values.resolution
        : defaultRecordSettings.resolution,
      quality: hasOption(recordQualityInput, values.quality) ? values.quality : defaultRecordSettings.quality,
    };

    recordSecondsInput.value = String(normalized.seconds);
    recordFpsInput.value = String(normalized.fps);
    recordResolutionInput.value = normalized.resolution;
    recordQualityInput.value = normalized.quality;
    updateRecordFrameHud();
  };

  const getMatchingRecordPreset = (values: RecordFormValues): Exclude<RecordPresetKey, "custom"> | null => {
    const entries = Object.entries(recordPresetConfigs) as Array<
      [Exclude<RecordPresetKey, "custom">, RecordFormValues]
    >;
    const match = entries.find(
      ([, preset]) =>
        preset.seconds === values.seconds &&
        preset.fps === values.fps &&
        preset.resolution === values.resolution &&
        preset.quality === values.quality,
    );
    return match ? match[0] : null;
  };

  const parseResolution = (value: string): { width: number; height: number } | null => {
    if (value === "source") {
      return null;
    }

    const [widthText, heightText] = value.split("x");
    const width = Number.parseInt(widthText ?? "", 10);
    const height = Number.parseInt(heightText ?? "", 10);
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      return null;
    }

    return { width, height };
  };

  const computeCenteredAspectCropRect = (
    sourceWidth: number,
    sourceHeight: number,
    targetAspect: number,
  ): { x: number; y: number; width: number; height: number } => {
    if (!Number.isFinite(targetAspect) || targetAspect <= 0 || sourceWidth <= 0 || sourceHeight <= 0) {
      return { x: 0, y: 0, width: sourceWidth, height: sourceHeight };
    }

    const sourceAspect = sourceWidth / sourceHeight;
    if (Math.abs(sourceAspect - targetAspect) < 0.0001) {
      return { x: 0, y: 0, width: sourceWidth, height: sourceHeight };
    }

    if (sourceAspect > targetAspect) {
      const cropWidth = Math.max(1, Math.round(sourceHeight * targetAspect));
      const x = Math.round((sourceWidth - cropWidth) / 2);
      return { x, y: 0, width: cropWidth, height: sourceHeight };
    }

    const cropHeight = Math.max(1, Math.round(sourceWidth / targetAspect));
    const y = Math.round((sourceHeight - cropHeight) / 2);
    return { x: 0, y, width: sourceWidth, height: cropHeight };
  };

  const updateRecordFrameHud = () => {
    if (!isRecording) {
      recordFrameHud.classList.remove("is-visible");
      return;
    }

    const resolution = parseResolution(recordResolutionInput.value);
    if (!resolution) {
      recordFrameHud.classList.remove("is-visible");
      return;
    }

    const sourceCanvas = requireCanvas();
    const crop = computeCenteredAspectCropRect(
      sourceCanvas.width,
      sourceCanvas.height,
      resolution.width / resolution.height,
    );
    const scaleX = sourceCanvas.clientWidth / sourceCanvas.width;
    const scaleY = sourceCanvas.clientHeight / sourceCanvas.height;
    recordFrameHud.style.left = `${crop.x * scaleX}px`;
    recordFrameHud.style.top = `${crop.y * scaleY}px`;
    recordFrameHud.style.width = `${crop.width * scaleX}px`;
    recordFrameHud.style.height = `${crop.height * scaleY}px`;
    recordFrameHudLabel.textContent = `${resolution.width}x${resolution.height} クロップ`;
    recordFrameHud.classList.add("is-visible");
  };

  const getRecordingConfig = () => {
    const formValues = getRecordFormValues();
    const resolution = parseResolution(formValues.resolution);
    const quality =
      formValues.quality === "auto"
        ? undefined
        : clampNumber(Number(formValues.quality), 100_000, 50_000_000, 5_000_000);

    applyRecordFormValues(formValues);

    return {
      seconds: formValues.seconds,
      fps: formValues.fps,
      quality,
      resolution,
    };
  };

  const refreshRecordButtonText = () => {
    if (isRecording) {
      return;
    }
    const seconds = clampNumber(Number(recordSecondsInput.value), 1, 120, durationSeconds);
    durationSeconds = seconds;
    recordSecondsInput.value = String(seconds);
    recordButton.textContent = `${seconds}秒録画`;
  };

  const updateRecordPresetFromInputs = () => {
    const matchingPreset = getMatchingRecordPreset(getRecordFormValues());
    recordPresetInput.value = matchingPreset ?? "custom";
  };

  const applyRecordPreset = (preset: RecordPresetKey) => {
    if (preset !== "custom") {
      applyRecordFormValues(recordPresetConfigs[preset]);
      recordPresetInput.value = preset;
    } else {
      updateRecordPresetFromInputs();
    }
    refreshRecordButtonText();
  };

  const applyRecordSettingsFromStorage = (settings: PersistedSettings) => {
    const preset = sanitizePreset(settings.recordPreset);
    const customValues: RecordFormValues = {
      seconds: settings.recordSeconds,
      fps: settings.recordFps,
      resolution: settings.recordResolution,
      quality: settings.recordQuality,
    };

    if (preset === "custom") {
      applyRecordFormValues(customValues);
      updateRecordPresetFromInputs();
    } else {
      applyRecordPreset(preset);
    }
    refreshRecordButtonText();
  };

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
    recordButton.textContent = recording ? "録画中..." : `${durationSeconds}秒録画`;
    recordStatus.classList.toggle("is-visible", recording);
    updateRecordFrameHud();
    if (!recording) {
      clearRecordingTicker();
    }
  };

  recordSecondsInput.addEventListener("input", () => {
    refreshRecordButtonText();
    updateRecordPresetFromInputs();
    persist();
  });

  recordFpsInput.addEventListener("input", () => {
    updateRecordPresetFromInputs();
    persist();
  });

  recordResolutionInput.addEventListener("change", () => {
    updateRecordPresetFromInputs();
    updateRecordFrameHud();
    persist();
  });

  recordQualityInput.addEventListener("change", () => {
    updateRecordPresetFromInputs();
    persist();
  });

  recordPresetInput.addEventListener("change", () => {
    applyRecordPreset(sanitizePreset(recordPresetInput.value));
    persist();
  });

  recordButton.addEventListener("click", (event) => {
    event.preventDefault();
    if (isRecording) {
      return;
    }
    if (typeof MediaRecorder === "undefined") {
      window.alert("このブラウザは録画に対応していません。");
      return;
    }

    const sourceCanvas = requireCanvas();
    if (typeof sourceCanvas.captureStream !== "function") {
      window.alert("このブラウザは録画に対応していません。");
      return;
    }

    const config = getRecordingConfig();
    durationSeconds = config.seconds;

    let streamSourceCanvas: HTMLCanvasElement = sourceCanvas;
    let previewCopyTicker: number | null = null;
    if (config.resolution) {
      const scaledCanvas = document.createElement("canvas");
      scaledCanvas.width = config.resolution.width;
      scaledCanvas.height = config.resolution.height;
      const scaledContext = scaledCanvas.getContext("2d");
      if (!scaledContext) {
        window.alert("録画用キャンバスの作成に失敗しました。");
        return;
      }

      const crop = computeCenteredAspectCropRect(
        sourceCanvas.width,
        sourceCanvas.height,
        config.resolution.width / config.resolution.height,
      );
      const drawScaledFrame = () => {
        scaledContext.drawImage(
          sourceCanvas,
          crop.x,
          crop.y,
          crop.width,
          crop.height,
          0,
          0,
          scaledCanvas.width,
          scaledCanvas.height,
        );
      };
      drawScaledFrame();
      previewCopyTicker = window.setInterval(drawScaledFrame, Math.max(16, Math.floor(1000 / config.fps)));
      streamSourceCanvas = scaledCanvas;
    }

    const stream = streamSourceCanvas.captureStream(config.fps);
    const optionsList = [
      "video/webm;codecs=vp9",
      "video/webm;codecs=vp8",
      "video/webm",
    ];
    const mimeType = optionsList.find((type) => MediaRecorder.isTypeSupported(type));
    const recorderOptions: MediaRecorderOptions = {};
    if (mimeType) {
      recorderOptions.mimeType = mimeType;
    }
    if (config.quality) {
      recorderOptions.videoBitsPerSecond = config.quality;
    }
    const recorder = new MediaRecorder(stream, recorderOptions);
    const chunks: BlobPart[] = [];

    setRecordingState(true);
    setRecordingStatusText(config.seconds);
    const startedAt = Date.now();
    recordTicker = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const remaining = Math.max(0, config.seconds - elapsed);
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
      if (previewCopyTicker !== null) {
        window.clearInterval(previewCopyTicker);
        previewCopyTicker = null;
      }

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
      if (previewCopyTicker !== null) {
        window.clearInterval(previewCopyTicker);
        previewCopyTicker = null;
      }
      setRecordingState(false);
      window.alert("録画に失敗しました。");
    });

    recorder.start(250);
    window.setTimeout(() => {
      if (recorder.state !== "inactive") {
        recorder.stop();
      }
    }, config.seconds * 1000);
  });

  refreshRecordButtonText();

  const performUndo = () => {
    if (undo()) {
      refreshUndoRedoButtons();
    }
  };

  const performRedo = () => {
    if (redo()) {
      refreshUndoRedoButtons();
    }
  };

  undoButton.addEventListener("click", performUndo);
  dockUndoButton.addEventListener("click", performUndo);
  redoButton.addEventListener("click", performRedo);
  dockRedoButton.addEventListener("click", performRedo);

  window.addEventListener("keydown", (event) => {
    const isMeta = event.ctrlKey || event.metaKey;
    if (!isMeta) {
      return;
    }

    const key = event.key.toLowerCase();
    if (key === "z" && event.shiftKey) {
      event.preventDefault();
      performRedo();
      return;
    }

    if (key === "z") {
      event.preventDefault();
      performUndo();
      return;
    }

    if (key === "y") {
      event.preventDefault();
      performRedo();
    }
  });

  const canvas = requireCanvas();
  canvas.style.touchAction = "none";
  window.addEventListener("resize", updateRecordFrameHud);

  const previewLoop = () => {
    syncDockColorPreview();
    window.requestAnimationFrame(previewLoop);
  };
  window.requestAnimationFrame(previewLoop);

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

  const applyPersistedSettingsToUi = (settings: PersistedSettings) => {
    shouldPersist = false;
    try {
      app.penCustomParams = normalizePenCustomParams(settings.penCustomParams);
      applyDockVisibility(true);
      penGroup.selectByValue(settings.pen) || penGroup.selectByValue(defaultPersistedSettings.pen);
      closePanels();
      applySize(settings.size);
      applyColor(settings.colorHex);

      app.isRainbowMode = settings.rainbowMode;
      applyRainbowSaturation(settings.rainbowSaturation);
      applyRainbowBrightness(settings.rainbowBrightness);
      updateRainbowControlsState();

      app.isFadeMode = settings.fadeMode;
      app.isAutoMode = settings.autoMode;

      app.isYamiMode = settings.yamiMode;
      applyYamiStrength(settings.yamiStrength);
      updateYamiControlsState();
      applyDrawCompositeOperation();

      symmetryMode.checked = settings.symmetryMode;
      app.isSymmetryMode = settings.symmetryMode;
      symmetryHud.checked = settings.symmetryHud;
      app.isSymmetryHudVisible = settings.symmetryHud;
      symmetryType.value = settings.symmetryType;
      app.symmetryType = settings.symmetryType;
      symmetryCount.value = String(settings.symmetryCount);
      app.symmetryCount = [2, 4, 6, 8, 16, 32].includes(settings.symmetryCount)
        ? settings.symmetryCount
        : 4;
      applySymmetryOriginX(settings.symmetryOriginX);
      applySymmetryOriginY(settings.symmetryOriginY);

      updateSymmetryControlsState();
      updateModeDockValue();
      updateYamiDockValue();
      updateSymmetryDockValue();
      refreshUndoRedoButtons();
      applyRecordSettingsFromStorage(settings);
    } finally {
      shouldPersist = true;
    }
    persist();
  };

  resetSettingsButton.addEventListener("click", () => {
    if (isRecording) {
      return;
    }
    saveSettings(defaultPersistedSettings);
    applyPersistedSettingsToUi(defaultPersistedSettings);
  });

  const settings = loadSettings();
  const safeSettings: PersistedSettings = {
    ...defaultPersistedSettings,
    ...settings,
  };

  applyPersistedSettingsToUi(safeSettings);
}
