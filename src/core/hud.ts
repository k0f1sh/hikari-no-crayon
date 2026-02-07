import { app, requireHudContext } from "./state";

function clearHud(): void {
  const hud = requireHudContext();
  hud.clearRect(0, 0, app.width, app.height);
}

function drawSymmetryAxes(): void {
  const hud = requireHudContext();
  const centerX = app.width / 2;
  const centerY = app.height / 2;
  const radius = Math.sqrt(centerX * centerX + centerY * centerY);
  const count = Math.max(1, app.symmetryCount);

  hud.save();
  hud.strokeStyle = "rgba(118, 246, 208, 0.45)";
  hud.lineWidth = 1;
  hud.setLineDash([8, 8]);

  for (let i = 0; i < count; i += 1) {
    const angle = (Math.PI * 2 * i) / count;
    const dx = Math.cos(angle) * radius;
    const dy = Math.sin(angle) * radius;

    hud.beginPath();
    hud.moveTo(centerX - dx, centerY - dy);
    hud.lineTo(centerX + dx, centerY + dy);
    hud.stroke();

    if (app.symmetryType === "mirror") {
      const mAngle = angle + Math.PI / 2;
      const mdx = Math.cos(mAngle) * radius;
      const mdy = Math.sin(mAngle) * radius;
      hud.beginPath();
      hud.moveTo(centerX - mdx, centerY - mdy);
      hud.lineTo(centerX + mdx, centerY + mdy);
      hud.stroke();
    }
  }

  hud.setLineDash([]);
  hud.fillStyle = "rgba(86, 177, 255, 0.85)";
  hud.beginPath();
  hud.arc(centerX, centerY, 3, 0, Math.PI * 2);
  hud.fill();
  hud.restore();
}

export function renderHud(): void {
  clearHud();

  if (!app.isSymmetryMode || !app.isSymmetryHudVisible) {
    return;
  }

  drawSymmetryAxes();
}
