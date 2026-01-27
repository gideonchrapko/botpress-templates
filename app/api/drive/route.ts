import { NextRequest, NextResponse } from "next/server";
import { GOOGLE_DRIVE_FOLDER_IDS } from "@/lib/drive-config";

/**
 * Google Drive API route
 * Fetches files and folders from specified Google Drive folders
 * 
 * Environment variables needed:
 * - GOOGLE_DRIVE_API_KEY: Your Google Drive API key
 * 
 * Folder IDs are configured in: lib/drive-config.ts
 */

interface DriveItem {
  id: string;
  name: string;
  mimeType: string;
  thumbnailLink?: string;
  webViewLink: string;
  iconLink?: string;
  folderColorRgb?: string;
}

export async function GET(req: NextRequest) {
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
    const allItems: DriveItem[] = [];

    // Fetch files from each folder
    for (const folderId of folderIds) {
      try {
        // First, get the folder itself
        const folderResponse = await fetch(
          `https://www.googleapis.com/drive/v3/files/${folderId}?key=${apiKey}&fields=id,name,mimeType,webViewLink,thumbnailLink,iconLink,folderColorRgb`
        );

        if (folderResponse.ok) {
          const folder = await folderResponse.json();
          // For folders, we don't need thumbnails, but keep the structure consistent
          allItems.push({
            id: folder.id,
            name: folder.name,
            mimeType: folder.mimeType,
            webViewLink: folder.webViewLink,
            thumbnailLink: folder.thumbnailLink,
            iconLink: folder.iconLink,
            folderColorRgb: folder.folderColorRgb,
          });
        }

        // Then, get files inside the folder
        const filesResponse = await fetch(
          `https://www.googleapis.com/drive/v3/files?key=${apiKey}&q='${folderId}'+in+parents+and+trashed=false&fields=files(id,name,mimeType,webViewLink,thumbnailLink,iconLink)&orderBy=name`
        );

        if (filesResponse.ok) {
          const data = await filesResponse.json();
          if (data.files) {
            // For images, always generate thumbnail URL (API thumbnailLink often requires auth)
            const filesWithThumbnails = data.files.map((file: any) => {
              if (file.mimeType?.startsWith("image/")) {
                // Use Google's thumbnail service - works for publicly shared files
                // Format: https://lh3.googleusercontent.com/d/FILE_ID=wSIZE-hSIZE
                file.thumbnailLink = `https://lh3.googleusercontent.com/d/${file.id}=w800-h600`;
              }
              return file;
            });
            allItems.push(...filesWithThumbnails);
          }
        }
      } catch (error) {
        console.error(`Error fetching folder ${folderId}:`, error);
        // Continue with other folders even if one fails
      }
    }

    // Log for debugging
    console.log(`Fetched ${allItems.length} items from ${folderIds.length} folders`);
    const imageItems = allItems.filter(item => item.mimeType?.startsWith("image/"));
    console.log(`Found ${imageItems.length} images with thumbnails:`, imageItems.map(i => ({ name: i.name, thumbnail: i.thumbnailLink })));

    return NextResponse.json({ items: allItems });
  } catch (error) {
    console.error("Error fetching Google Drive items:", error);
    return NextResponse.json(
      { error: "Failed to fetch Google Drive items" },
      { status: 500 }
    );
  }
}
