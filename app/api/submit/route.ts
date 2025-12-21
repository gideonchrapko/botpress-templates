import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { lightenColor } from "@/lib/utils";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

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
    const format = formData.get("format") as string;
    const eventTitle = formData.get("eventTitle") as string;
    const venueName = formData.get("venueName") as string;
    const addressLine = formData.get("addressLine") as string;
    const cityLine = formData.get("cityLine") as string;
    const eventDate = new Date(formData.get("eventDate") as string);

    const peopleCountNum = parseInt(peopleCount);
    const people = [];
    const uploadUrls = [];

    // Create storage directory if it doesn't exist
    const storageDir = join(process.cwd(), "storage", "uploads");
    if (!existsSync(storageDir)) {
      await mkdir(storageDir, { recursive: true });
    }

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

      // Save headshot file
      const bytes = await headshot.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const filename = `${Date.now()}_${i}_${headshot.name}`;
      const filepath = join(storageDir, filename);
      await writeFile(filepath, buffer);

      const uploadUrl = `/storage/uploads/${filename}`;
      uploadUrls.push(uploadUrl);

      people.push({
        name,
        role,
        talkTitle,
        headshotUrl: uploadUrl,
      });
    }

    const secondaryColor = lightenColor(primaryColor, 15);
    const templateVariant = `linkedin-${peopleCount}`;

    // Create submission record
    const submission = await prisma.submission.create({
      data: {
        ownerEmail: session.user.email,
        templateFamily: "linkedin",
        templateVariant,
        primaryColor,
        secondaryColor,
        scale,
        format,
        eventTitle,
        venueName,
        addressLine,
        cityLine,
        eventDate,
        people: JSON.stringify(people),
        uploadUrls: JSON.stringify(uploadUrls),
      },
    });

    // Trigger rendering (async)
    fetch(`${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/render`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ submissionId: submission.id }),
    }).catch(console.error);

    return NextResponse.json({ submissionId: submission.id });
  } catch (error) {
    console.error("Error submitting form:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

