import { app, requireCanvas } from "./state";

function downloadDataUrl(url: string, filename: string): void {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export function exportPng(options: { scale: number }): void {
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

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  downloadDataUrl(out.toDataURL("image/png"), `hikari-no-crayon-${timestamp}.png`);
}
