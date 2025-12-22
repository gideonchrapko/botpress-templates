"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export function RetryRenderButton({ submissionId }: { submissionId: string }) {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      const response = await fetch("/api/render", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ submissionId }),
      });

      if (!response.ok) {
        throw new Error("Rendering failed");
      }

      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch {
      alert("Failed to trigger rendering. Please try again.");
      setIsRetrying(false);
    }
  };

  return (
    <Button onClick={handleRetry} disabled={isRetrying}>
      <RefreshCw className={`mr-2 h-4 w-4 ${isRetrying ? "animate-spin" : ""}`} />
      {isRetrying ? "Rendering..." : "Retry Rendering"}
    </Button>
  );
}

