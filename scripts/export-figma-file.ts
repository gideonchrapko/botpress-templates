/**
 * Fetch a Figma file via REST API and save raw JSON.
 * Use this to get "everything Figma gives you" as v0, then map to your import format.
 *
 * Usage:
 *   FIGMA_ACCESS_TOKEN=xxx FIGMA_FILE_KEY=abc123 bun run scripts/export-figma-file.ts
 *   FIGMA_ACCESS_TOKEN=xxx bun run scripts/export-figma-file.ts abc123
 *
 * With multiple templates in one file, export one frame by node ID:
 *   FIGMA_FILE_KEY=abc123 FIGMA_NODE_ID=123:456 bun run scripts/export-figma-file.ts
 *   (Get node ID: right-click frame in Figma → "Copy link to selection" → node-id= in URL)
 *
 * Output:
 *   With FIGMA_NODE_ID: examples/figma-raw-<file_key>-<node_id>.json (that frame only)
 *   Without:           examples/figma-raw-<file_key>.json (full file)
 */

import { writeFile } from "fs/promises";
import { join } from "path";

const token = process.env.FIGMA_ACCESS_TOKEN;
const fileKey = process.env.FIGMA_FILE_KEY ?? process.argv[2];
const nodeId = process.env.FIGMA_NODE_ID;

if (!token) {
  console.error("Set FIGMA_ACCESS_TOKEN (e.g. in .env or export FIGMA_ACCESS_TOKEN=...)");
  process.exit(1);
}
if (!fileKey) {
  console.error("Pass file key: FIGMA_FILE_KEY=xxx bun run scripts/export-figma-file.ts");
  console.error("Or: bun run scripts/export-figma-file.ts <file_key>");
  console.error("File key is from the Figma URL: figma.com/file/<file_key>/...");
  process.exit(1);
}

function findNodeById(node: any, id: string): any | null {
  if (node.id === id) return node;
  if (node.children) {
    for (const child of node.children) {
      const found = findNodeById(child, id);
      if (found) return found;
    }
  }
  return null;
}

async function main() {
  const url = `https://api.figma.com/v1/files/${fileKey}`;
  const res = await fetch(url, { headers: { "X-Figma-Token": token as string } });
  if (!res.ok) {
    console.error("Figma API error:", res.status, await res.text());
    process.exit(1);
  }
  const data = await res.json();
  const examplesDir = join(process.cwd(), "examples");

  // Normalize line endings so editors don't warn about U+2028/U+2029 in Figma text
  const toCleanJson = (obj: any) =>
    JSON.stringify(obj, null, 2).replace(/\u2028/g, "\\n").replace(/\u2029/g, "\\n");

  if (nodeId) {
    // Figma API uses colon (794:4044); "Copy link" gives hyphen (794-4044) — accept both
    const normalizedNodeId = nodeId.replace("-", ":");
    const root = data.document;
    const frame = root ? findNodeById(root, normalizedNodeId) : null;
    if (!frame) {
      console.error("Node ID not found:", nodeId);
      console.error("Tip: Right-click the frame in Figma → Copy link to selection → use node-id= from URL");
      process.exit(1);
    }
    const safeId = nodeId.replace(/[^a-zA-Z0-9-]/g, "_");
    const framePath = join(examplesDir, `figma-raw-${fileKey}-${safeId}.json`);
    await writeFile(framePath, toCleanJson(frame), "utf-8");
    console.log("Wrote", framePath, `(frame: ${frame.name ?? nodeId})`);
  } else {
    const fullPath = join(examplesDir, `figma-raw-${fileKey}.json`);
    await writeFile(fullPath, toCleanJson(data), "utf-8");
    console.log("Wrote", fullPath);
    console.log("Document node count (top-level):", data.document?.children?.length ?? 0);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
