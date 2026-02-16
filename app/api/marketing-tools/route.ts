/**
 * GET /api/marketing-tools - List all marketing tools (public read)
 * POST /api/marketing-tools - Add a tool (auth required, same as templates)
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getMarketingTools, createMarketingTool, type MarketingTool } from "@/lib/marketing-tools";

export async function GET() {
  try {
    const tools = await getMarketingTools();
    return NextResponse.json(tools);
  } catch (error) {
    console.error("List marketing tools error:", error);
    return NextResponse.json(
      { error: "Failed to list marketing tools" },
      { status: 500 }
    );
  }
}

export const POST = auth(async (req) => {
  const session = req.auth;
  const isBotpress = session?.user?.email?.endsWith("@botpress.com");
  const allowInDev = process.env.NODE_ENV === "development" && session?.user;
  if (!session?.user?.email || (!isBotpress && !allowInDev)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as Partial<MarketingTool>;
    const slug = (body.slug ?? "").trim().toLowerCase().replace(/\s+/g, "-");
    const name = (body.name ?? "").trim();
    const description = (body.description ?? "").trim();
    const iframeUrl = (body.iframeUrl ?? "").trim();

    if (!slug || !name) {
      return NextResponse.json(
        { error: "Slug and name are required" },
        { status: 400 }
      );
    }
    if (!description) {
      return NextResponse.json(
        { error: "Description is required" },
        { status: 400 }
      );
    }
    if (!iframeUrl) {
      return NextResponse.json(
        { error: "Iframe URL is required" },
        { status: 400 }
      );
    }

    const tools = await getMarketingTools();
    if (tools.some((t) => t.slug === slug)) {
      return NextResponse.json(
        { error: `A tool with slug "${slug}" already exists` },
        { status: 409 }
      );
    }

    const newTool = await createMarketingTool({ slug, name, description, iframeUrl });
    return NextResponse.json(newTool);
  } catch (error) {
    console.error("Add marketing tool error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to add marketing tool", detail: message },
      { status: 500 }
    );
  }
});
