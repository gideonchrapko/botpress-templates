import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import os from "os";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params;
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use /tmp in production (Vercel), storage in local dev
    const filePath = process.env.VERCEL
      ? join(os.tmpdir(), "storage", ...path)
      : join(process.cwd(), "storage", ...path);
    
    // Try to read from file system first (for local dev)
    if (existsSync(filePath)) {
      const file = await readFile(filePath);
      const ext = filePath.split(".").pop()?.toLowerCase();
      
      let contentType = "application/octet-stream";
      if (ext === "png") contentType = "image/png";
      else if (ext === "jpg" || ext === "jpeg") contentType = "image/jpeg";
      else if (ext === "webp") contentType = "image/webp";
      else if (ext === "pdf") contentType = "application/pdf";

      return new NextResponse(file, {
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": `inline; filename="${filePath.split("/").pop()}"`,
        },
      });
    }

    // If file doesn't exist on disk (Vercel /tmp is ephemeral), try to get from database
    // Path format: outputs/{submissionId}.{format}
    if (path[0] === "outputs" && path[1]) {
      const filename = path[1];
      const submissionId = filename.split(".")[0];
      
      const submission = await prisma.submission.findUnique({
        where: { id: submissionId },
        select: { outputs: true, ownerEmail: true },
      });

      if (submission && submission.ownerEmail === session.user.email && submission.outputs) {
        const outputs = JSON.parse(submission.outputs) as Array<{
          url: string;
          format: string;
          mimeType: string;
          dataUri?: string;
        }>;
        
        const output = outputs.find((o) => o.url === `/storage/${path.join("/")}`);
        if (output?.dataUri) {
          // Extract base64 data from data URI
          const base64Data = output.dataUri.split(",")[1];
          const buffer = Buffer.from(base64Data, "base64");
          
          return new NextResponse(buffer, {
            headers: {
              "Content-Type": output.mimeType,
              "Content-Disposition": `inline; filename="${filename}"`,
            },
          });
        }
      }
    }

    return NextResponse.json({ error: "File not found" }, { status: 404 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

