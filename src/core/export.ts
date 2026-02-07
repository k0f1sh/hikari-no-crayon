import { app, requireCanvas } from "./state";

function applyTransparency(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }

  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = image.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (r <= 2 && g <= 2 && b <= 2) {
      data[i + 3] = 0;
    }
  }

  ctx.putImageData(image, 0, 0);
}

function downloadDataUrl(url: string, filename: string): void {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export function exportPng(options: { scale: number; transparent: boolean }): void {
  const scale = Math.max(1, Math.min(8, Math.floor(options.scale)));
  const source = requireCanvas();

  const out = document.createElement("canvas");
  out.width = app.width * scale;
  out.height = app.height * scale;

  const ctx = out.getContext("2d");
  if (!ctx) {
    return;
  }

  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(source, 0, 0, out.width, out.height);

  if (options.transparent) {
    applyTransparency(out);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  downloadDataUrl(out.toDataURL("image/png"), `hikari-no-crayon-${timestamp}.png`);
}
