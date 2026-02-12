/**
 * DELETE /api/templates/[family] - Delete a template from DB and filesystem
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { existsSync } from "fs";
import { join } from "path";
import { rm } from "fs/promises";

export const DELETE = auth(async (req, { params }) => {
  const session = req.auth;
  const isBotpress = session?.user?.email?.endsWith("@botpress.com");
  const allowInDev = process.env.NODE_ENV === "development" && session?.user;
  if (!session?.user?.email || (!isBotpress && !allowInDev)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const family = (await params).family;
  if (!family) {
    return NextResponse.json({ error: "Missing family" }, { status: 400 });
  }

  let deletedFromDb = false;
  let deletedFromFs = false;

  try {
    await prisma.template.delete({ where: { family } });
    deletedFromDb = true;
  } catch (error: any) {
    if (error.code !== "P2025") {
      console.error("Delete template DB error:", error);
      return NextResponse.json(
        { error: "Failed to delete from database" },
        { status: 500 }
      );
    }
  }

  const templateDir = join(process.cwd(), "templates", family);
  if (existsSync(templateDir)) {
    try {
      await rm(templateDir, { recursive: true, force: true });
      deletedFromFs = true;
    } catch (error: any) {
      console.error("Delete template FS error:", error);
    }
  }

  if (!deletedFromDb && !deletedFromFs) {
    return NextResponse.json(
      { error: `Template "${family}" not found` },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    family,
    deletedFromDb,
    deletedFromFs,
  });
});
