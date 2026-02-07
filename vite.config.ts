import { defineConfig } from "vite";
import type { Plugin } from "rollup";
import path from "node:path";
import { access, readdir, readFile, rm, writeFile } from "node:fs/promises";

const MIME_TYPES: Record<string, string> = {
  ".css": "text/css",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "text/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp"
};

function getMimeType(fileName: string): string {
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex === -1) {
    return "application/octet-stream";
  }
  return MIME_TYPES[fileName.slice(dotIndex).toLowerCase()] ?? "application/octet-stream";
}

function toDataUri(fileName: string, source: string | Uint8Array): string {
  const mime = getMimeType(fileName);
  const buffer =
    typeof source === "string" ? Buffer.from(source, "utf-8") : Buffer.from(source);
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

function inlineBuildOutput(): Plugin {
  let outDir = "dist";

  return {
    name: "inline-build-output",
    apply: "build",
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    async closeBundle() {
      const indexPath = path.join(outDir, "index.html");
      let html: string;

      try {
        html = await readFile(indexPath, "utf-8");
      } catch {
        return;
      }

      const resolveAssetPath = (value: string): string | null => {
        if (/^(https?:|data:|#)/.test(value)) {
          return null;
        }
        const cleanPath = value.startsWith("/") ? value.slice(1) : value.replace(/^\.\//, "");
        return path.join(outDir, cleanPath);
      };

      const fileExists = async (filePath: string): Promise<boolean> => {
        try {
          await access(filePath);
          return true;
        } catch {
          return false;
        }
      };

      html = await replaceAsync(
        html,
        /<script\b[^>]*\bsrc="([^"]+)"[^>]*><\/script>/g,
        async (_match, src: string) => {
          const assetPath = resolveAssetPath(src);
          if (!assetPath || !(await fileExists(assetPath))) {
            return _match;
          }
          const script = await readFile(assetPath, "utf-8");
          return `<script type="module">\n${script}\n</script>`;
        }
      );

      html = await replaceAsync(
        html,
        /<link\b[^>]*\brel="stylesheet"[^>]*\bhref="([^"]+)"[^>]*>/g,
        async (_match, href: string) => {
          const assetPath = resolveAssetPath(href);
          if (!assetPath || !(await fileExists(assetPath))) {
            return _match;
          }
          const css = await readFile(assetPath, "utf-8");
          return `<style>\n${css}\n</style>`;
        }
      );

      html = await replaceAsync(
        html,
        /(src|href)="([^"]+)"/g,
        async (match, attrName: string, value: string) => {
          const assetPath = resolveAssetPath(value);
          if (!assetPath || !(await fileExists(assetPath))) {
            return match;
          }
          const content = await readFile(assetPath);
          const dataUri = toDataUri(assetPath, content);
          return `${attrName}="${dataUri}"`;
        }
      );

      await writeFile(indexPath, html, "utf-8");
      await removeNonIndexFiles(outDir);
    }
  };
}

async function removeNonIndexFiles(rootDir: string): Promise<void> {
  const entries = await readdir(rootDir, { withFileTypes: true });
  for (const entry of entries) {
    const absolutePath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      await rm(absolutePath, { force: true, recursive: true });
      continue;
    }
    if (entry.name !== "index.html") {
      await rm(absolutePath, { force: true });
    }
  }
}

async function replaceAsync(
  input: string,
  pattern: RegExp,
  replacer: (match: string, ...groups: string[]) => Promise<string>
): Promise<string> {
  let result = "";
  let lastIndex = 0;

  for (const match of input.matchAll(pattern)) {
    const start = match.index ?? 0;
    result += input.slice(lastIndex, start);
    result += await replacer(match[0], ...(match.slice(1) as string[]));
    lastIndex = start + match[0].length;
  }

  result += input.slice(lastIndex);
  return result;
}

export default defineConfig({
  build: {
    assetsInlineLimit: 1_000_000_000,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        inlineDynamicImports: true
      }
    }
  },
  plugins: [inlineBuildOutput()]
});
