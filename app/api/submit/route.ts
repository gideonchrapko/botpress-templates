import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { lightenColor } from "@/lib/utils";
import sharp from "sharp";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email || !session.user.email.endsWith("@botpress.com")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const primaryColor = formData.get("primaryColor") as string;
    const peopleCount = formData.get("peopleCount") as string;
    const scale = parseInt(formData.get("scale") as string);
    // Get all formats from form data
    const formats = formData.getAll("formats") as string[];
    if (!formats || formats.length === 0) {
      return NextResponse.json({ error: "At least one format must be selected" }, { status: 400 });
    }
    const eventTitle = formData.get("eventTitle") as string;
    const eventDate = new Date(formData.get("eventDate") as string);
    
    // Hardcoded location values (matching template)
    const venueName = "Botpress HQ";
    const addressLine = "400 Blvd. De Maisonneuve Ouest";
    const cityLine = "Montreal, QC  H3A 1L4";
    const doorTime = (formData.get("doorTime") as string) || "18:00"; // Default to 6:00 PM if not provided

    const peopleCountNum = parseInt(peopleCount);
    const people = [];
    const uploadUrls = [];

    // Process each person
    for (let i = 0; i < peopleCountNum; i++) {
      const headshot = formData.get(`headshot_${i}`) as File;
      const name = formData.get(`person_${i}_name`) as string;
      const role = formData.get(`person_${i}_role`) as string;
      const talkTitle = formData.get(`person_${i}_talkTitle`) as string;

      if (!headshot || !name || !role || !talkTitle) {
        return NextResponse.json(
          { error: `Missing data for person ${i + 1}` },
          { status: 400 }
        );
      }

      // Convert headshot to base64 for storage (works in both local and Vercel)
      // First, compress and resize the image to reduce file size
      const bytes = await headshot.arrayBuffer();
      const inputBuffer = Buffer.from(bytes);
      
      // Resize to max 800x800 (maintains aspect ratio) and compress
      const compressedBuffer = await sharp(inputBuffer)
        .resize(800, 800, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality: 85, mozjpeg: true }) // Convert to JPEG for better compression
        .toBuffer();
      
      const mimeType = "image/jpeg";
      const base64 = compressedBuffer.toString("base64");
      const headshotDataUri = `data:${mimeType};base64,${base64}`;

      // Store as data URI instead of file path (works in serverless)
      const uploadUrl = headshotDataUri;
      uploadUrls.push(uploadUrl);

      people.push({
        name,
        role,
        talkTitle,
        headshotUrl: uploadUrl, // Now contains base64 data URI
      });
    }

    const secondaryColor = lightenColor(primaryColor, 15);
    const templateVariant = `mtl-code-${peopleCount}`;

    // Create submission record
    const submission = await prisma.submission.create({
      data: {
        ownerEmail: session.user.email,
        templateFamily: "mtl-code",
        templateVariant,
        primaryColor,
        secondaryColor,
        scale,
        formats: JSON.stringify(formats),
        eventTitle,
        venueName,
        addressLine,
        cityLine,
        eventDate,
        doorTime,
        people: JSON.stringify(people),
        uploadUrls: JSON.stringify(uploadUrls),
      },
    });

    // Trigger rendering (async) - pass cookies for authentication
    const cookies = req.headers.get("cookie") || "";
    fetch(`${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/render`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookies,
      },
      body: JSON.stringify({ submissionId: submission.id }),
    });

    return NextResponse.json({ submissionId: submission.id });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

