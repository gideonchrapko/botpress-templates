/**
 * Figma Import API - MVP for Phase 3
 * Accepts Figma export data and generates template files
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateTemplateFromFigma } from "@/lib/figma-template-generator";
import { FigmaExport } from "@/lib/figma-import-types";
import { clearTemplateConfigCache } from "@/lib/template-registry";

export const POST = auth(async (req) => {
  try {
    const session = req.auth;
    const isBotpress = session?.user?.email?.endsWith("@botpress.com");
    const allowInDev = process.env.NODE_ENV === "development" && session?.user;
    if (!session?.user?.email || (!isBotpress && !allowInDev)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = await req.json();
    
    // Validate Figma export structure
    if (!body.name || !body.width || !body.height || !Array.isArray(body.nodes)) {
      return NextResponse.json(
        { error: "Invalid Figma export format. Required: name, width, height, nodes[]" },
        { status: 400 }
      );
    }

    const figmaExport: FigmaExport = {
      name: body.name,
      width: body.width,
      height: body.height,
      nodes: body.nodes,
      images: body.images || {},
      svgs: body.svgs || {}
    };

    // Generate template files
    const result = await generateTemplateFromFigma(figmaExport);
    // So submit/render use fresh config (no stale cache after re-import)
    clearTemplateConfigCache(result.templateId);

    return NextResponse.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error("Figma import error:", error);
    return NextResponse.json(
      { 
        error: "Failed to import Figma template",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
});
