/**
 * PATCH /api/marketing-tools/[slug] - Update a marketing tool
 * DELETE /api/marketing-tools/[slug] - Delete a marketing tool
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getMarketingTools, updateMarketingTool, deleteMarketingTool, type MarketingTool } from "@/lib/marketing-tools";

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
    if (body.slug !== undefined && body.slug.trim() !== slug) {
      const newSlug = body.slug.trim().toLowerCase().replace(/\s+/g, "-");
      const tools = await getMarketingTools();
      if (tools.some((t) => t.slug === newSlug)) {
        return NextResponse.json({ error: `Slug "${newSlug}" already in use` }, { status: 409 });
      }
    }

    const updated = await updateMarketingTool(slug, body);
    if (!updated) {
      return NextResponse.json({ error: "Tool not found" }, { status: 404 });
    }
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
    const deleted = await deleteMarketingTool(slug);
    if (!deleted) {
      return NextResponse.json({ error: "Tool not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, slug });
  } catch (error) {
    console.error("Delete marketing tool error:", error);
    return NextResponse.json(
      { error: "Failed to delete marketing tool" },
      { status: 500 }
    );
  }
});
