import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { renderTemplate, getPosterDimensions } from "@/lib/template-renderer";
import { getTemplateConfig } from "@/lib/template-registry";
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

const SYSTEM_CHROME_PATHS_DARWIN = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
];

/** Local dev: path to Chrome/Chromium. On macOS always prefer system Chrome; never use Puppeteer's cache path (causes ENOEXEC). */
function getLocalChromePath(): string | undefined {
  if (process.platform !== "darwin") {
    const fromEnv = process.env.PUPPETEER_EXECUTABLE_PATH?.trim();
    if (fromEnv && !fromEnv.includes("/var/folders/") && !fromEnv.includes("/tmp/")) return fromEnv;
    return undefined;
  }
  // macOS: Puppeteer often overwrites PUPPETEER_EXECUTABLE_PATH with its cache path, so ignore env and use system path
  const paths = [
    ...SYSTEM_CHROME_PATHS_DARWIN,
    ...(process.env.HOME ? [`${process.env.HOME}/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`] : []),
  ];
  for (const p of paths) {
    if (existsSync(p)) return p;
  }
  // Fallback: use the standard path even if existsSync failed (e.g. sandbox); launch will fail with a clearer error
  return SYSTEM_CHROME_PATHS_DARWIN[0];
}

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

    // Parse formats from JSON (user can select multiple: png, jpg, webp, pdf)
    const validFormats = ["png", "jpg", "webp", "pdf"];
    let formats: string[] = [];
    try {
      const parsed = JSON.parse(submission.formats) as string[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        formats = [...new Set(parsed.map((f) => String(f).toLowerCase()).filter((f) => validFormats.includes(f)))];
      }
      if (formats.length === 0) {
        formats = ["png"];
      }
    } catch (error) {
      console.error("Error parsing formats, using default:", error);
      formats = ["png"];
    }
    
    // Render HTML template
    let html: string;
    try {
      html = await renderTemplate(submission);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      console.error("=== TEMPLATE RENDERING ERROR ===");
      console.error("Error Message:", errorMessage);
      console.error("Error Stack:", errorStack);
      console.error("Submission ID:", submissionId);
      console.error("Template Family:", submission.templateFamily);
      console.error("Template Variant:", submission.templateVariant);
      console.error("Submission data:", {
        eventTitle: submission.eventTitle,
        eventDate: submission.eventDate,
        primaryColor: submission.primaryColor,
        people: submission.people?.substring(0, 100),
        uploadUrlsLength: submission.uploadUrls?.length || 0,
        uploadUrlsPreview: submission.uploadUrls?.substring(0, 500),
      });
      
      // For blog-image-generator, try to parse and show the structure
      if (submission.templateFamily === 'blog-image-generator') {
        try {
          const uploadUrls = JSON.parse(submission.uploadUrls || '{}');
          console.error("Parsed uploadUrls structure:", {
            hasSelection: !!uploadUrls.selection,
            selectionKeys: uploadUrls.selection ? Object.keys(uploadUrls.selection) : [],
            componentsCount: uploadUrls.components?.length || 0,
            componentsPreview: uploadUrls.components?.slice(0, 3).map((c: any) => ({
              name: c.name,
              type: c.type,
              hasImageUrl: !!c.imageUrl
            }))
          });
        } catch (parseError) {
          console.error("Failed to parse uploadUrls JSON:", parseError);
        }
      }
      
      console.error("=================================");
      
      return NextResponse.json(
        { 
          error: "Failed to render template", 
          details: errorMessage,
          submissionId,
          templateFamily: submission.templateFamily,
        },
        { status: 500 }
      );
    }
    
    // Get template dimensions from config (use actual template size, not hardcoded)
    const config = await getTemplateConfig(submission.templateFamily);
    let dimensions: { width: number; height: number };
    if (config && config.width != null && config.height != null) {
      // Use template's actual dimensions with scale; Puppeteer requires integer viewport
      dimensions = {
        width: Math.round(Number(config.width) * submission.scale),
        height: Math.round(Number(config.height) * submission.scale),
      };
    } else {
      dimensions = getPosterDimensions(submission.scale);
    }

    // Launch Puppeteer with Chromium
    // For Vercel, use @sparticuz/chromium (serverless-optimized)
    // For local dev, use system Chrome if available to avoid spawn ENOEXEC (missing/wrong Chromium)
    const puppeteer = await getPuppeteer();
    // Use Vercel's Chromium only when actually deployed (production). Locally, or if .env has VERCEL from a pull, use system Chrome.
    const useVercelChromium = process.env.VERCEL && process.env.NODE_ENV === "production";
    const executablePath = useVercelChromium
      ? await chromium.executablePath()
      : getLocalChromePath() ?? undefined;

    if (!process.env.VERCEL && process.env.NODE_ENV === "development") {
      const which = executablePath || "(Puppeteer default)";
      console.log("[RENDER] Launching browser, executablePath:", which);
      if (!executablePath && process.platform === "darwin") {
        console.log("[RENDER] No system Chrome found at", SYSTEM_CHROME_PATHS_DARWIN.join(" or "));
      }
    }

    let browser;
    try {
      browser = await puppeteer.launch({
        args: process.env.VERCEL ? chromium.args : ['--no-sandbox', '--disable-setuid-sandbox'],
        executablePath,
        headless: true,
      });
    } catch (launchErr: unknown) {
      const msg = launchErr instanceof Error ? launchErr.message : String(launchErr);
      if (msg.includes("ENOEXEC") || msg.includes("spawn")) {
        const hint = executablePath
          ? `Tried: ${executablePath} — try setting PUPPETEER_EXECUTABLE_PATH to that path in .env`
          : "Set PUPPETEER_EXECUTABLE_PATH in .env to your Chrome path, e.g. /Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
        console.error("[RENDER] Chromium launch failed:", msg, hint);
        return NextResponse.json(
          {
            error: "Rendering failed",
            details: "Could not launch browser. " + hint,
          },
          { status: 500 }
        );
      }
      throw launchErr;
    }
    const page = await browser.newPage();
    
    // Set viewport to match poster dimensions (Puppeteer requires integers)
    const viewportWidth = Math.max(1, Math.floor(dimensions.width));
    const viewportHeight = Math.max(1, Math.floor(dimensions.height));
    await page.setViewport({
      width: viewportWidth,
      height: viewportHeight,
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
          width: `${viewportWidth}px`,
          height: `${viewportHeight}px`,
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
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("[RENDER] Unexpected error:", message);
    if (stack) console.error("[RENDER] Stack:", stack);
    return NextResponse.json(
      { error: "Rendering failed", details: process.env.NODE_ENV === "development" ? message : undefined },
      { status: 500 }
    );
  }
}

