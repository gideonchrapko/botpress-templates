"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RefreshCw } from "lucide-react";

export function RetryRenderButton({ submissionId }: { submissionId: string }) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRetry = async () => {
    setIsRetrying(true);
    setErrorMessage(null);
    try {
      const response = await fetch("/api/render", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ submissionId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Rendering failed");
      }

      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to trigger rendering. Please try again.";
      setErrorMessage(message);
      setIsRetrying(false);
    }
  };

  return (
    <>
      <Button onClick={handleRetry} disabled={isRetrying}>
        <RefreshCw className={`mr-2 h-4 w-4 ${isRetrying ? "animate-spin" : ""}`} />
        {isRetrying ? "Rendering..." : "Retry Rendering"}
      </Button>
      <AlertDialog open={errorMessage !== null} onOpenChange={(open) => !open && setErrorMessage(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rendering failed</AlertDialogTitle>
            <AlertDialogDescription>{errorMessage ?? "Something went wrong."}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setErrorMessage(null)}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

