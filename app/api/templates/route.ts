/**
 * GET /api/templates - List all templates (for dev UI, scripts)
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAllTemplateConfigs } from "@/lib/template-registry";

export const GET = auth(async (req) => {
  const session = req.auth;
  const isBotpress = session?.user?.email?.endsWith("@botpress.com");
  const allowInDev = process.env.NODE_ENV === "development" && session?.user;
  if (!session?.user?.email || (!isBotpress && !allowInDev)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const configs = await getAllTemplateConfigs();
    const list = configs.map((c) => ({
      family: c.id,
      name: c.name,
      format: c.format ?? "html",
    }));
    return NextResponse.json(list);
  } catch (error) {
    console.error("List templates error:", error);
    return NextResponse.json(
      { error: "Failed to list templates" },
      { status: 500 }
    );
  }
});
