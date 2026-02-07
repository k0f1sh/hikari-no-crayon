import { app, requireCanvas } from "../core/state";
import { applyDrawCompositeOperation, clear, reverseImage } from "../core/draw";
import { rgbToHex } from "../core/color";
import {
  extractSvgPathDataList,
  fitPointsToCanvas,
  sampleSvgPathPoints,
} from "../core/svgPathTrace";
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

const PEN_CATALOG = [
  { value: "normal_pen", icon: "光", name: "ひかりのくれよん" },
  { value: "blood_pen", icon: "血", name: "けっかんぺんしる" },
  { value: "fur_pen", icon: "毛", name: "ふぁーえんぴつ" },
  { value: "snow_pen", icon: "雪", name: "ゆきぱすてる" },
  { value: "collatz_pen", icon: "∞", name: "こらっつすたんぷ" },
  { value: "hoshi_pen", icon: "星", name: "ほしわいやー" },
  { value: "hane_pen", icon: "羽", name: "はねぺん" },
  { value: "nami_pen", icon: "波", name: "なみふで" },
  { value: "spray_pen", icon: "霧", name: "すぷれーかん" },
  { value: "bubble_pen", icon: "泡", name: "あわすぷれー" },
  { value: "orbit_pen", icon: "彗", name: "おーびっとぺん" },
  { value: "degi_pen", icon: "電", name: "でじたるぺん" },
  { value: "shinmyaku_pen", icon: "脈", name: "しんみゃくぺん" },
] as const;

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
  const dockUndoButton = byId<HTMLButtonElement>("dock_undo_button");
  const dockRedoButton = byId<HTMLButtonElement>("dock_redo_button");
  const dockClearButton = byId<HTMLButtonElement>("dock_clear_button");
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
  let shouldPersist = true;

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

  const penGroup = setupRadioGroup("pen", (value) => {
    app.selectedPenName = value;
    app.penTool = app.penTools[value]
      ?? app.penTools[defaultPersistedSettings.pen]
      ?? Object.values(app.penTools)[0]
      ?? null;
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
      applyDockVisibility(true);
      penGroup.selectByValue(settings.pen) || penGroup.selectByValue(defaultPersistedSettings.pen);
      closePanels();
      applySize(settings.size);
      applyColor(settings.colorHex);

      rainbowMode.checked = settings.rainbowMode;
      app.isRainbowMode = settings.rainbowMode;
      applyRainbowSaturation(settings.rainbowSaturation);
      applyRainbowBrightness(settings.rainbowBrightness);
      updateRainbowControlsState();

      fadeMode.checked = settings.fadeMode;
      app.isFadeMode = settings.fadeMode;

      autoMode.checked = settings.autoMode;
      app.isAutoMode = settings.autoMode;

      yamiMode.checked = settings.yamiMode;
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
