"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Folder, FileText, Image as ImageIcon, ExternalLink } from "lucide-react";
import Link from "next/link";

interface DriveItem {
  id: string;
  name: string;
  mimeType: string;
  thumbnailLink?: string;
  webViewLink: string;
  iconLink?: string;
  folderColorRgb?: string;
}

export default function DriveGallery() {
  const [items, setItems] = useState<DriveItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchItems() {
      try {
        const response = await fetch("/api/drive");
        if (!response.ok) {
          throw new Error("Failed to fetch Drive items");
        }
        const data = await response.json();
        console.log("Drive items:", data.items); // Debug log
        setItems(data.items || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load items");
      } finally {
        setLoading(false);
      }
    }

    fetchItems();
  }, []);

  const getIcon = (mimeType: string) => {
    if (mimeType === "application/vnd.google-apps.folder") {
      return <Folder className="h-8 w-8" />;
    }
    if (mimeType.startsWith("image/")) {
      return <ImageIcon className="h-8 w-8" />;
    }
    return <FileText className="h-8 w-8" />;
  };

  const isFolder = (mimeType: string) => {
    return mimeType === "application/vnd.google-apps.folder";
  };

  const isImage = (mimeType: string) => {
    return mimeType.startsWith("image/");
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Loading resources...</p>
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

  if (items.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No resources available</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <Link
          key={item.id}
          href={item.webViewLink}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Card className="cursor-pointer hover:shadow-lg transition-shadow h-full">
            <CardHeader>
              <div className="flex items-center gap-3">
                {isImage(item.mimeType) && item.thumbnailLink ? (
                  <img
                    src={item.thumbnailLink}
                    alt={item.name}
                    className="h-16 w-16 object-cover rounded"
                  />
                ) : (
                  <div
                    className="h-16 w-16 flex items-center justify-center rounded"
                    style={{
                      backgroundColor: item.folderColorRgb
                        ? `#${item.folderColorRgb}`
                        : "hsl(var(--muted))",
                    }}
                  >
                    {getIcon(item.mimeType)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg truncate">{item.name}</CardTitle>
                  <CardDescription className="flex items-center gap-1 mt-1">
                    {isFolder(item.mimeType) ? "Folder" : "File"}
                    <ExternalLink className="h-3 w-3" />
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            {isImage(item.mimeType) && item.thumbnailLink && (
              <CardContent>
                <img
                  src={item.thumbnailLink}
                  alt={item.name}
                  className="w-full h-48 object-cover rounded bg-muted"
                  loading="lazy"
                  onError={(e) => {
                    console.error("Failed to load thumbnail for:", item.name, "URL:", item.thumbnailLink);
                    // Try fallback URL with different size
                    const target = e.target as HTMLImageElement;
                    const fallbackUrl = `https://lh3.googleusercontent.com/d/${item.id}=w400-h300`;
                    if (target.src !== fallbackUrl) {
                      target.src = fallbackUrl;
                    } else {
                      target.style.display = 'none';
                    }
                  }}
                />
              </CardContent>
            )}
          </Card>
        </Link>
      ))}
    </div>
  );
}
