/**
 * Marketing tools shown under the Tools tab. Each has a slug used in the URL: /tools/[slug]
 * Stored in DB so updates work on Vercel (serverless filesystem is read-only).
 * Manage tools via Admin → Marketing Tools.
 */

import { prisma } from "@/lib/prisma";

export type MarketingTool = {
  slug: string;
  name: string;
  description: string;
  iframeUrl?: string;
};

export async function getMarketingTools(): Promise<MarketingTool[]> {
  try {
    const rows = await prisma.marketingTool.findMany({
      orderBy: { slug: "asc" },
    });
    return rows.map((r: { slug: string; name: string; description: string; iframeUrl: string | null }) => ({
      slug: r.slug,
      name: r.name,
      description: r.description,
      iframeUrl: r.iframeUrl ?? undefined,
    }));
  } catch (e) {
    // Table may not exist yet if migration hasn't run (e.g. new Vercel deploy)
    console.warn("Marketing tools: read failed", e);
    return [];
  }
}

export async function getMarketingToolBySlug(slug: string): Promise<MarketingTool | null> {
  try {
    const row = await prisma.marketingTool.findUnique({
      where: { slug },
    });
    if (!row) return null;
    return {
      slug: row.slug,
      name: row.name,
      description: row.description,
      iframeUrl: row.iframeUrl ?? undefined,
    };
  } catch (e) {
    console.warn("Marketing tools: get by slug failed", e);
    return null;
  }
}

/** Create one tool. Used by POST API. */
export async function createMarketingTool(tool: MarketingTool): Promise<MarketingTool> {
  const row = await prisma.marketingTool.create({
    data: {
      slug: tool.slug,
      name: tool.name,
      description: tool.description,
      iframeUrl: tool.iframeUrl ?? null,
    },
  });
  return {
    slug: row.slug,
    name: row.name,
    description: row.description,
    iframeUrl: row.iframeUrl ?? undefined,
  };
}

/** Update one tool by current slug. Used by PATCH API. */
export async function updateMarketingTool(
  currentSlug: string,
  updates: Partial<MarketingTool>
): Promise<MarketingTool | null> {
  const existing = await prisma.marketingTool.findUnique({ where: { slug: currentSlug } });
  if (!existing) return null;

  const newSlug =
    updates.slug !== undefined
      ? updates.slug.trim().toLowerCase().replace(/\s+/g, "-")
      : existing.slug;

  const row = await prisma.marketingTool.update({
    where: { slug: currentSlug },
    data: {
      ...(updates.name !== undefined && { name: String(updates.name).trim() }),
      ...(updates.description !== undefined && { description: String(updates.description).trim() }),
      ...(updates.iframeUrl !== undefined && {
        iframeUrl: String(updates.iframeUrl).trim() || null,
      }),
      ...(newSlug !== currentSlug && { slug: newSlug }),
    },
  });
  return {
    slug: row.slug,
    name: row.name,
    description: row.description,
    iframeUrl: row.iframeUrl ?? undefined,
  };
}

/** Delete one tool by slug. Used by DELETE API. */
export async function deleteMarketingTool(slug: string): Promise<boolean> {
  try {
    await prisma.marketingTool.delete({ where: { slug } });
    return true;
  } catch {
    return false;
  }
}
