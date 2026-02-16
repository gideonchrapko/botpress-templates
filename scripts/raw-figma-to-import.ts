/**
 * Convert raw Figma frame JSON (from export-figma-file.ts with FIGMA_NODE_ID)
 * into the import format expected by POST /api/import/figma.
 *
 * Usage:
 *   bun run scripts/raw-figma-to-import.ts examples/figma-raw-TQ8HjO6jnzMjvKUnAQNhAN-794_4044.json
 *   bun run scripts/raw-figma-to-import.ts   # uses FIGMA_RAW_FILE env or first figma-raw-*-*.json in examples
 *
 * Output: examples/figma-import-<name>.json (safe filename from frame name)
 * Then: curl -X POST http://localhost:3000/api/import/figma -H "Content-Type: application/json" -H "Cookie: ..." -d @examples/figma-import-*.json
 */

import { readFile, writeFile } from "fs/promises";
import { join, basename } from "path";

const rawPath = process.env.FIGMA_RAW_FILE ?? process.argv[2];

const FIGMA_ACCESS_TOKEN = process.env.FIGMA_ACCESS_TOKEN;

/** Collect node IDs that are vector/shape and can be exported as SVG */
function collectSvgNodeIds(node: any, out: string[]): void {
  if (node.type === "VECTOR" || node.type === "RECTANGLE" || node.type === "ELLIPSE") {
    if (node.id) out.push(node.id);
  }
  if (node.children) {
    for (const c of node.children) collectSvgNodeIds(c, out);
  }
}

/** Extract Figma file key from raw filename e.g. figma-raw-TQ8HjO6jnzMjvKUnAQNhAN-808-249.json (file key has no hyphens) */
function getFileKeyFromRawPath(filePath: string): string | null {
  const name = basename(filePath, ".json");
  if (!name.startsWith("figma-raw-")) return null;
  const rest = name.slice("figma-raw-".length);
  const firstDash = rest.indexOf("-");
  if (firstDash <= 0) return null;
  return rest.slice(0, firstDash);
}

/** Fetch SVGs from Figma Images API and return nodeId -> raw SVG string */
async function fetchSvgsForNodes(fileKey: string, nodeIds: string[]): Promise<Record<string, string>> {
  if (!FIGMA_ACCESS_TOKEN || nodeIds.length === 0) return {};
  const idsParam = nodeIds.join(",");
  const url = `https://api.figma.com/v1/images/${fileKey}?ids=${encodeURIComponent(idsParam)}&format=svg`;
  const res = await fetch(url, { headers: { "X-Figma-Token": FIGMA_ACCESS_TOKEN } });
  if (!res.ok) {
    console.warn("Figma Images API error:", res.status, await res.text());
    return {};
  }
  const data = (await res.json()) as { images?: Record<string, string>; err?: string };
  if (data.err || !data.images) return {};
  const svgs: Record<string, string> = {};
  for (const [id, imageUrl] of Object.entries(data.images)) {
    if (!imageUrl) continue;
    try {
      const svgRes = await fetch(imageUrl);
      if (svgRes.ok) {
        svgs[id] = await svgRes.text();
      }
    } catch (e) {
      console.warn("Failed to fetch SVG for", id, e);
    }
  }
  return svgs;
}

function figmaColorToHex(c: { r: number; g: number; b: number; a?: number }): string {
  const r = Math.round(c.r * 255);
  const g = Math.round(c.g * 255);
  const b = Math.round(c.b * 255);
  const a = c.a !== undefined ? c.a : 1;
  if (a < 1) return `rgba(${r},${g},${b},${a})`;
  return `#${[r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}

function getBox(node: any): { x: number; y: number; width: number; height: number } | null {
  const box = node.absoluteBoundingBox;
  if (!box || typeof box.x !== "number") return null;
  return { x: box.x, y: box.y, width: box.width, height: box.height };
}

function collectBounds(node: any, out: { x: number; y: number; w: number; h: number }[]): void {
  const box = getBox(node);
  if (box) out.push({ x: box.x, y: box.y, w: box.width, h: box.height });
  if (node.children) node.children.forEach((c: any) => collectBounds(c, out));
}

function mapFills(fills: any[] | undefined): any[] | undefined {
  if (!fills?.length) return undefined;
  return fills.map((f: any) => {
    if (f.type === "SOLID" && f.color) {
      return { type: "SOLID", color: f.color };
    }
    if (f.type === "IMAGE" && f.imageRef) {
      return { type: "IMAGE", imageRef: f.imageRef };
    }
    return null;
  }).filter(Boolean);
}

function mapNode(raw: any, originX: number, originY: number): any {
  const box = getBox(raw);
  const x = box ? box.x - originX : 0;
  const y = box ? box.y - originY : 0;
  const width = box ? box.width : 0;
  const height = box ? box.height : 0;

  const out: any = {
    id: raw.id,
    name: raw.name ?? "Unnamed",
    type: raw.type,
    x: Math.round(x * 100) / 100,
    y: Math.round(y * 100) / 100,
    width: Math.round(width * 100) / 100,
    height: Math.round(height * 100) / 100,
  };

  const fills = mapFills(raw.fills);
  if (fills?.length) out.fills = fills;

  if (raw.type === "TEXT") {
    if (raw.characters != null) out.characters = raw.characters;
    const fillColor = raw.fills?.[0]?.type === "SOLID" && raw.fills[0].color
      ? figmaColorToHex(raw.fills[0].color)
      : "#000000";
    const style = raw.style || {};
    out.style = {
      fontFamily: style.fontFamily ?? "Aspekta",
      fontSize: style.fontSize ?? 16,
      fontWeight: style.fontWeight ?? 400,
      textAlign: (style.textAlignHorizontal ?? "LEFT").replace("JUSTIFIED", "LEFT"),
      fill: fillColor,
    };
  }

  if (raw.children?.length) {
    out.children = raw.children.map((c: any) => mapNode(c, originX, originY));
  }

  return out;
}

async function main() {
  let path = rawPath;
  if (!path) {
    const { readdir } = await import("fs/promises");
    const examples = join(process.cwd(), "examples");
    const files = await readdir(examples);
    const match = files.find((f) => f.startsWith("figma-raw-") && f.includes("-") && f.endsWith(".json"));
    if (!match) {
      console.error("Usage: bun run scripts/raw-figma-to-import.ts <path-to-figma-raw-*.json>");
      console.error("Or set FIGMA_RAW_FILE or put figma-raw-<key>-<node>.json in examples/");
      process.exit(1);
    }
    path = join(examples, match);
    console.log("Using", path);
  }
  if (!path.startsWith("/") && !path.startsWith(".")) {
    path = join(process.cwd(), path);
  }

  const raw = JSON.parse(await readFile(path, "utf-8"));
  const bounds: { x: number; y: number; w: number; h: number }[] = [];
  collectBounds(raw, bounds);
  if (bounds.length === 0) {
    console.error("No absoluteBoundingBox found in any node.");
    process.exit(1);
  }
  const minX = Math.min(...bounds.map((b) => b.x));
  const minY = Math.min(...bounds.map((b) => b.y));
  const maxX = Math.max(...bounds.map((b) => b.x + b.w));
  const maxY = Math.max(...bounds.map((b) => b.y + b.h));
  const width = Math.round((maxX - minX) * 100) / 100;
  const height = Math.round((maxY - minY) * 100) / 100;

  const mapped = mapNode(raw, minX, minY);
  const name = (raw.name ?? "template").replace(/[^a-zA-Z0-9-_ ]/g, "").trim() || "template";

  // Export vector/shape nodes as SVG via Figma Images API (optional; needs FIGMA_ACCESS_TOKEN)
  let svgs: Record<string, string> = {};
  const svgNodeIds: string[] = [];
  collectSvgNodeIds(raw, svgNodeIds);
  const fileKey = getFileKeyFromRawPath(path);
  if (FIGMA_ACCESS_TOKEN && fileKey && svgNodeIds.length > 0) {
    console.log("Exporting", svgNodeIds.length, "shape(s) as SVG…");
    svgs = await fetchSvgsForNodes(fileKey, svgNodeIds);
    console.log("Got", Object.keys(svgs).length, "SVG(s)");
  }

  const exportData = {
    name,
    width,
    height,
    nodes: [mapped],
    images: {},
    ...(Object.keys(svgs).length > 0 && { svgs }),
  };

  const outName = `figma-import-${name.replace(/\s+/g, "-").toLowerCase()}.json`;
  const outPath = join(process.cwd(), "examples", outName);
  await writeFile(outPath, JSON.stringify(exportData, null, 2), "utf-8");
  console.log("Wrote", outPath);
  console.log("Next: POST this file to /api/import/figma (see FIGMA-IMPORT-MVP.md)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
