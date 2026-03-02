"use client";

import { useEffect, useState } from "react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Folder, ExternalLink } from "lucide-react";
import Link from "next/link";

interface DriveFolder {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
  folderColorRgb?: string;
}

interface DriveGalleryProps {
  folderId?: string;
}

export default function DriveGallery({ folderId }: DriveGalleryProps) {
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchFolders() {
      try {
        const url = folderId
          ? `/api/drive?folderId=${encodeURIComponent(folderId)}`
          : "/api/drive";
        const response = await fetch(url);
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || "Failed to fetch folders");
        }
        const data = await response.json();
        setFolders(data.items || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load folders");
      } finally {
        setLoading(false);
      }
    }

    fetchFolders();
  }, [folderId]);

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Loading folders...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  if (folders.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No folders available</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {folders.map((folder) => (
        <Link
          key={folder.id}
          href={folder.webViewLink}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Card className="cursor-pointer hover:shadow-lg transition-shadow h-full">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div
                  className="h-16 w-16 flex items-center justify-center rounded"
                  style={{
                    backgroundColor: folder.folderColorRgb
                      ? `#${folder.folderColorRgb}`
                      : "hsl(var(--muted))",
                  }}
                >
                  <Folder className="h-8 w-8" />
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg truncate">{folder.name}</CardTitle>
                  <CardDescription className="flex items-center gap-1 mt-1">
                    Folder
                    <ExternalLink className="h-3 w-3" />
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </Link>
      ))}
    </div>
  );
}
