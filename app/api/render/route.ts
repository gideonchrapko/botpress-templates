import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { renderTemplate, getPosterDimensions } from "@/lib/template-renderer";
import puppeteerCore from "puppeteer-core";
import chromium from "@sparticuz/chromium";

// Use full puppeteer in dev (includes Chromium), puppeteer-core in production
// Dynamically import puppeteer only in dev to avoid bundling it in production
const getPuppeteer = async () => {
  if (process.env.VERCEL) {
    return puppeteerCore;
  }
  // Only import full puppeteer in local dev
  const puppeteerFull = await import("puppeteer");
  return puppeteerFull.default;
};
import { writeFile, mkdir, readFile } from "fs/promises";
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
    let formats: string[] = [];
    try {
      formats = JSON.parse(submission.formats) as string[];
      if (!Array.isArray(formats)) {
        formats = ["png"]; // Default fallback
      }
    } catch (error) {
      console.error("Error parsing formats, using default:", error);
      formats = ["png"]; // Default fallback
    }
    
    // Render HTML template
    let html: string;
    try {
      html = await renderTemplate(submission);
    } catch (error) {
      console.error("Error rendering template:", error);
      console.error("Submission ID:", submissionId);
      console.error("Template Family:", submission.templateFamily);
      console.error("Template Variant:", submission.templateVariant);
      return NextResponse.json(
        { 
          error: "Failed to render template", 
          details: error instanceof Error ? error.message : String(error) 
        },
        { status: 500 }
      );
    }
    const dimensions = getPosterDimensions(submission.scale);

    // Launch Puppeteer with Chromium
    // For Vercel, use @sparticuz/chromium (serverless-optimized)
    // For local dev, use full puppeteer (includes Chromium)
    const puppeteer = await getPuppeteer();
    const browser = await puppeteer.launch({
      args: process.env.VERCEL ? chromium.args : ['--no-sandbox', '--disable-setuid-sandbox'],
      executablePath: process.env.VERCEL
        ? await chromium.executablePath()
        : undefined, // Full puppeteer in dev includes Chromium, so undefined is fine
      headless: true,
    });
    const page = await browser.newPage();
    
    // Set viewport to match poster dimensions
    await page.setViewport({
      width: dimensions.width,
      height: dimensions.height,
    });

    // Load HTML
    await page.setContent(html, { waitUntil: "networkidle0" });

    // Use /tmp in production (Vercel), storage/outputs in local dev
    const outputDir = process.env.VERCEL
      ? join(os.tmpdir(), "storage", "outputs")
      : join(process.cwd(), "storage", "outputs");
    if (!existsSync(outputDir)) {
      await mkdir(outputDir, { recursive: true });
    }

    // Generate outputs for each format
    const outputs: Array<{ url: string; format: string; mimeType: string; dataUri?: string }> = [];

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
        // Puppeteer doesn't support webp in screenshot type, save as png
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

      // Read file into memory and convert to base64
      // This is necessary because Vercel's /tmp is ephemeral
      const fileBuffer = await readFile(filepath);
      const base64 = fileBuffer.toString("base64");
      const mimeType =
        format === "pdf"
          ? "application/pdf"
          : format === "jpg"
          ? "image/jpeg"
          : format === "webp"
          ? "image/png" // Saved as PNG but with webp extension
          : `image/${format}`;
      const dataUri = `data:${mimeType};base64,${base64}`;

      // Store as data URI in database (works in both local and Vercel)
      const outputUrl = `/storage/outputs/${filename}`;
      outputs.push({ url: outputUrl, format, mimeType, dataUri });
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
  } catch {
    return NextResponse.json({ error: "Rendering failed" }, { status: 500 });
  }
}

