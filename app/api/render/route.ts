import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { renderTemplate, getPosterDimensions } from "@/lib/template-renderer";
import { chromium } from "playwright";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

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

    // Create output directory
    const outputDir = join(process.cwd(), "storage", "outputs");
    if (!existsSync(outputDir)) {
      await mkdir(outputDir, { recursive: true });
    }

    const filename = `${submissionId}.${submission.format}`;
    const filepath = join(outputDir, filename);

    // Generate output based on format
    if (submission.format === "pdf") {
      await page.pdf({
        path: filepath,
        width: `${dimensions.width}px`,
        height: `${dimensions.height}px`,
        printBackground: true,
      });
    } else if (submission.format === "webp") {
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
        type: submission.format === "jpg" ? "jpeg" : "png",
        fullPage: true,
      });
    }

    await browser.close();

    // Update submission with output URL
    const outputUrl = `/storage/outputs/${filename}`;
    const mimeType =
      submission.format === "pdf"
        ? "application/pdf"
        : submission.format === "jpg"
        ? "image/jpeg"
        : submission.format === "webp"
        ? "image/png" // Saved as PNG but with webp extension
        : `image/${submission.format}`;

    await prisma.submission.update({
      where: { id: submissionId },
      data: {
        outputUrl,
        outputMimeType: mimeType,
      },
    });

    return NextResponse.json({ success: true, outputUrl });
  } catch (error) {
    console.error("Error rendering:", error);
    return NextResponse.json(
      { error: "Rendering failed" },
      { status: 500 }
    );
  }
}

