/**
 * PATCH /api/marketing-tools/[slug] - Update a marketing tool
 * DELETE /api/marketing-tools/[slug] - Delete a marketing tool
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getMarketingTools, writeMarketingTools, type MarketingTool } from "@/lib/marketing-tools";

export const PATCH = auth(async (req, { params }: { params: Promise<{ slug: string }> }) => {
  const session = req.auth;
  const isBotpress = session?.user?.email?.endsWith("@botpress.com");
  const allowInDev = process.env.NODE_ENV === "development" && session?.user;
  if (!session?.user?.email || (!isBotpress && !allowInDev)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const slug = (await params).slug;
  if (!slug) {
    return NextResponse.json({ error: "Missing slug" }, { status: 400 });
  }

  try {
    const body = (await req.json()) as Partial<MarketingTool>;
    const tools = getMarketingTools();
    const index = tools.findIndex((t) => t.slug === slug);
    if (index === -1) {
      return NextResponse.json({ error: "Tool not found" }, { status: 404 });
    }

    const updated: MarketingTool = {
      ...tools[index],
      ...(body.name !== undefined && { name: String(body.name).trim() }),
      ...(body.description !== undefined && { description: String(body.description).trim() }),
      ...(body.iframeUrl !== undefined && { iframeUrl: String(body.iframeUrl).trim() || undefined }),
    };
    if (body.slug !== undefined && body.slug.trim() !== slug) {
      const newSlug = body.slug.trim().toLowerCase().replace(/\s+/g, "-");
      if (tools.some((t) => t.slug === newSlug && t.slug !== slug)) {
        return NextResponse.json({ error: `Slug "${newSlug}" already in use` }, { status: 409 });
      }
      updated.slug = newSlug;
    }

    const next = [...tools];
    next[index] = updated;
    writeMarketingTools(next);
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update marketing tool error:", error);
    return NextResponse.json(
      { error: "Failed to update marketing tool" },
      { status: 500 }
    );
  }
});

export const DELETE = auth(async (req, { params }: { params: Promise<{ slug: string }> }) => {
  const session = req.auth;
  const isBotpress = session?.user?.email?.endsWith("@botpress.com");
  const allowInDev = process.env.NODE_ENV === "development" && session?.user;
  if (!session?.user?.email || (!isBotpress && !allowInDev)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const slug = (await params).slug;
  if (!slug) {
    return NextResponse.json({ error: "Missing slug" }, { status: 400 });
  }

  try {
    const tools = getMarketingTools();
    const filtered = tools.filter((t) => t.slug !== slug);
    if (filtered.length === tools.length) {
      return NextResponse.json({ error: "Tool not found" }, { status: 404 });
    }
    writeMarketingTools(filtered);
    return NextResponse.json({ success: true, slug });
  } catch (error) {
    console.error("Delete marketing tool error:", error);
    return NextResponse.json(
      { error: "Failed to delete marketing tool" },
      { status: 500 }
    );
  }
});
