import { readFile, writeFile } from "node:fs/promises";

const INDEX_PATH = new URL("../index.html", import.meta.url);
const DEV_SCRIPT = '<script type="module" src="/src/main.ts"></script>';

const SOURCE = await readFile(INDEX_PATH, "utf8");

if (SOURCE.includes(DEV_SCRIPT)) {
  process.exit(0);
}

const updated = SOURCE.replace(
  /<script\s+type="module"(?:\s+src="[^"]+")?\s*>[\s\S]*?<\/script>/,
  DEV_SCRIPT
);

if (updated === SOURCE) {
  console.warn("[ensure-dev-entry] module script tag not found; skipped.");
  process.exit(0);
}

await writeFile(INDEX_PATH, updated, "utf8");
console.log("[ensure-dev-entry] reset index.html module entry to /src/main.ts");
