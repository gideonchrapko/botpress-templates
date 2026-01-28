import { NextResponse } from "next/server";
import { GOOGLE_DRIVE_FOLDER_IDS } from "@/lib/drive-config";

/**
 * Google Drive API route
 * Fetches folders from specified Google Drive folder IDs
 * 
 * Environment variables needed:
 * - GOOGLE_DRIVE_API_KEY: Your Google Drive API key
 * 
 * Folder IDs are configured in: lib/drive-config.ts
 */

interface DriveFolder {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
  folderColorRgb?: string;
}

export async function GET() {
  const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
  const folderIds = GOOGLE_DRIVE_FOLDER_IDS;

  if (!apiKey) {
    return NextResponse.json(
      { error: "GOOGLE_DRIVE_API_KEY not configured" },
      { status: 500 }
    );
  }

  if (folderIds.length === 0) {
    return NextResponse.json(
      { error: "No folder IDs configured. Add folder IDs to lib/drive-config.ts" },
      { status: 500 }
    );
  }

  try {
    const folders: DriveFolder[] = [];

    // Fetch folders from configured folder IDs
    for (const folderId of folderIds) {
      try {
        const folderResponse = await fetch(
          `https://www.googleapis.com/drive/v3/files/${folderId}?key=${apiKey}&fields=id,name,mimeType,webViewLink,folderColorRgb`
        );

        if (folderResponse.ok) {
          const folder = await folderResponse.json();
          if (folder.mimeType === "application/vnd.google-apps.folder") {
            folders.push({
              id: folder.id,
              name: folder.name,
              mimeType: folder.mimeType,
              webViewLink: folder.webViewLink,
              folderColorRgb: folder.folderColorRgb,
            });
          }
        }
      } catch (error) {
        console.error(`Error fetching folder ${folderId}:`, error);
      }
    }

    return NextResponse.json({ items: folders });
  } catch (error) {
    console.error("Error fetching Google Drive items:", error);
    return NextResponse.json(
      { error: "Failed to fetch Google Drive items" },
      { status: 500 }
    );
  }
}
