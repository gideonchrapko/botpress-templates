import { NextRequest, NextResponse } from "next/server";
import { GOOGLE_DRIVE_PARENT_FOLDER_ID } from "@/lib/drive-config";

/**
 * Google Drive API route
 * Lists all subfolders inside a parent folder.
 *
 * Query params:
 * - folderId (optional): Google Drive folder ID. If omitted, uses default from lib/drive-config.ts
 *
 * Environment variables needed:
 * - GOOGLE_DRIVE_API_KEY: Your Google Drive API key
 */

interface DriveFolder {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
  folderColorRgb?: string;
}

export async function GET(request: NextRequest) {
  const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
  const { searchParams } = new URL(request.url);
  const folderIdParam = searchParams.get("folderId");
  const parentId = folderIdParam?.trim() || GOOGLE_DRIVE_PARENT_FOLDER_ID;

  if (!apiKey) {
    return NextResponse.json(
      { error: "GOOGLE_DRIVE_API_KEY not configured" },
      { status: 500 }
    );
  }

  if (!parentId) {
    return NextResponse.json(
      {
        error:
          "No folder ID provided. Pass ?folderId=... or set GOOGLE_DRIVE_PARENT_FOLDER_ID in lib/drive-config.ts",
      },
      { status: 400 }
    );
  }

  try {
    // List all subfolders of the parent folder
    const q = encodeURIComponent(
      `'${parentId}' in parents and mimeType='application/vnd.google-apps.folder'`
    );
    const listUrl = `https://www.googleapis.com/drive/v3/files?key=${apiKey}&q=${q}&fields=files(id,name,mimeType,webViewLink,folderColorRgb)&orderBy=name`;

    const response = await fetch(listUrl);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Google Drive API error:", response.status, errorText);
      return NextResponse.json(
        { error: "Failed to fetch subfolders from Google Drive" },
        { status: response.status }
      );
    }

    const data = await response.json();
    const files = data.files || [];

    const folders: DriveFolder[] = files.map(
      (f: {
        id: string;
        name: string;
        mimeType: string;
        webViewLink?: string;
        folderColorRgb?: string;
      }) => ({
        id: f.id,
        name: f.name,
        mimeType: f.mimeType,
        webViewLink:
          f.webViewLink ||
          `https://drive.google.com/drive/folders/${f.id}`,
        folderColorRgb: f.folderColorRgb,
      })
    );

    return NextResponse.json({ items: folders });
  } catch (error) {
    console.error("Error fetching Google Drive subfolders:", error);
    return NextResponse.json(
      { error: "Failed to fetch Google Drive items" },
      { status: 500 }
    );
  }
}
