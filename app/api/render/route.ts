import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { renderTemplate, getPosterDimensions } from "@/lib/template-renderer";
import { chromium } from "playwright";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import os from "os";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { submissionId } = await req.json();
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
    });

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    if (submission.ownerEmail !== session.user.email) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Parse formats from JSON
    const formats = JSON.parse(submission.formats) as string[];
    
    // Render HTML template
    const html = await renderTemplate(submission);
    const dimensions = getPosterDimensions(submission.scale);

    // Launch Playwright
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    // Set viewport to match poster dimensions
    await page.setViewportSize({
      width: dimensions.width,
      height: dimensions.height,
    });

    // Load HTML
    await page.setContent(html, { waitUntil: "networkidle" });

    // Use /tmp in production (Vercel), storage/outputs in local dev
    const outputDir = process.env.VERCEL
      ? join(os.tmpdir(), "storage", "outputs")
      : join(process.cwd(), "storage", "outputs");
    if (!existsSync(outputDir)) {
      await mkdir(outputDir, { recursive: true });
    }

    // Generate outputs for each format
    const outputs: Array<{ url: string; format: string; mimeType: string }> = [];

    for (const format of formats) {
      const filename = `${submissionId}.${format}`;
      const filepath = join(outputDir, filename);

      // Generate output based on format
      if (format === "pdf") {
        await page.pdf({
          path: filepath,
          width: `${dimensions.width}px`,
          height: `${dimensions.height}px`,
          printBackground: true,
        });
      } else if (format === "webp") {
        // Playwright doesn't support webp in screenshot type, save as png
        // The file will be served with webp extension but actual format is png
        await page.screenshot({
          path: filepath,
          type: "png",
          fullPage: true,
        });
      } else {
        await page.screenshot({
          path: filepath,
          type: format === "jpg" ? "jpeg" : "png",
          fullPage: true,
        });
      }

      const outputUrl = `/storage/outputs/${filename}`;
      const mimeType =
        format === "pdf"
          ? "application/pdf"
          : format === "jpg"
          ? "image/jpeg"
          : format === "webp"
          ? "image/png" // Saved as PNG but with webp extension
          : `image/${format}`;

      outputs.push({ url: outputUrl, format, mimeType });
    }

    await browser.close();

    // Update submission with all outputs
    await prisma.submission.update({
      where: { id: submissionId },
      data: {
        outputs: JSON.stringify(outputs),
      },
    });

    return NextResponse.json({ success: true, outputs });
  } catch (error) {
    console.error("Render error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Rendering failed", details: errorMessage },
      { status: 500 }
    );
  }
}

