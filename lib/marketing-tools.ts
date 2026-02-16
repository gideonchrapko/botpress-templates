/**
 * Marketing tools shown under the Tools tab. Each has a slug used in the URL: /tools/[slug]
 * Data is stored in data/marketing-tools.json. Manage tools via Admin → Marketing Tools.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

export type MarketingTool = {
  slug: string;
  name: string;
  description: string;
  iframeUrl?: string;
};

const DATA_PATH = join(process.cwd(), "data", "marketing-tools.json");

function readTools(): MarketingTool[] {
  try {
    if (existsSync(DATA_PATH)) {
      const raw = readFileSync(DATA_PATH, "utf-8");
      const parsed = JSON.parse(raw) as MarketingTool[];
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn("Marketing tools: could not read data file", e);
  }
  return [];
}

export function getMarketingTools(): MarketingTool[] {
  return readTools();
}

export function getMarketingToolBySlug(slug: string): MarketingTool | null {
  return getMarketingTools().find((t) => t.slug === slug) ?? null;
}

/** Write tools to data file (for API routes). */
export function writeMarketingTools(tools: MarketingTool[]): void {
  const dir = join(process.cwd(), "data");
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(DATA_PATH, JSON.stringify(tools, null, 2), "utf-8");
}
