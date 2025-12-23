import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const submission = await prisma.submission.findUnique({
      where: { id },
      select: {
        id: true,
        ownerEmail: true,
        outputs: true,
      },
    });

    if (!submission || submission.ownerEmail !== session.user.email) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const outputs = submission.outputs
      ? (JSON.parse(submission.outputs) as Array<{
          url: string;
          format: string;
          mimeType: string;
        }>)
      : null;

    return NextResponse.json({ outputs });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

