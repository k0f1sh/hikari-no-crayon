import { app, requireCanvas } from "../core/state";
import { clear, blurImage, reverseImage } from "../core/draw";
import { hsvToRgb } from "../core/color";

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

function setupRadioGroup(name: string, onChange: (value: string) => void): void {
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

  const checked = inputs.find((input) => input.checked);
  if (checked) {
    checked.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

function setPointerPosition(event: PointerEvent): void {
  app.mouse.x = event.pageX;
  app.mouse.y = event.pageY;
}

export function bindUiEvents(): void {
  let showMenu = true;

  const switchButton = byId<HTMLElement>("switch");
  const menu = byId<HTMLElement>("menu");
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

  setupRadioGroup("pen", (value) => {
    app.penTool = app.penTools[value];
  });

  setupRadioGroup("size", (value) => {
    app.penSize = Number(value);
  });

  setupRadioGroup("color", (value) => {
    app.penColor = hsvToRgb(Number(value), 200, 200);
  });

  byId<HTMLInputElement>("rainbow_mode").addEventListener("change", (event) => {
    app.isRainbowMode = (event.currentTarget as HTMLInputElement).checked;
  });

  byId<HTMLInputElement>("auto_mode").addEventListener("change", (event) => {
    app.isAutoMode = (event.currentTarget as HTMLInputElement).checked;
  });

  byId<HTMLInputElement>("fade_mode").addEventListener("change", (event) => {
    app.isFadeMode = (event.currentTarget as HTMLInputElement).checked;
  });

  byId<HTMLElement>("clear_button").addEventListener("click", () => {
    clear(app.c!);
    app.effects = [];
  });

  byId<HTMLElement>("reverse_button").addEventListener("click", () => {
    reverseImage();
  });

  byId<HTMLElement>("blur_button").addEventListener("click", () => {
    blurImage();
  });

  byId<HTMLElement>("save_button").addEventListener("click", () => {
    const url = requireCanvas().toDataURL();
    window.open(url);
  });

  const canvas = requireCanvas();
  canvas.style.touchAction = "none";

  canvas.addEventListener("pointermove", (event) => {
    setPointerPosition(event);
    app.c!.globalCompositeOperation = "lighter";
    if (app.isDown && app.penTool) {
      app.penTool.draw(event.pageX, event.pageY);
    }
  });

  canvas.addEventListener("pointerdown", (event) => {
    app.isDown = true;
    setPointerPosition(event);
    app.penTool?.draw(event.pageX, event.pageY);
  });

  const stopDrawing = () => {
    app.isDown = false;
  };

  canvas.addEventListener("pointerup", stopDrawing);
  canvas.addEventListener("pointercancel", stopDrawing);
  canvas.addEventListener("pointerleave", stopDrawing);
  canvas.addEventListener("mouseout", () => {
    app.mouse.x = "none";
    app.mouse.y = "none";
  });
}
