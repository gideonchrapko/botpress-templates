"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function AutoRefresh({ 
  hasOutputs, 
  submissionId 
}: { 
  hasOutputs: boolean; 
  submissionId: string;
}) {
  const router = useRouter();

  useEffect(() => {
    // If no outputs, check every 3 seconds and refresh when ready
    if (!hasOutputs) {
      const interval = setInterval(async () => {
        try {
          const response = await fetch(`/api/submission/${submissionId}`);
          if (response.ok) {
            const data = await response.json();
            if (data.outputs && data.outputs.length > 0) {
              // Outputs are ready, refresh the page
              router.refresh();
              clearInterval(interval);
            }
          }
        } catch (error) {
          // Silently fail, will retry on next interval
        }
      }, 3000); // Check every 3 seconds

      // Cleanup interval on unmount
      return () => clearInterval(interval);
    }
  }, [hasOutputs, submissionId, router]);

  return null; // This component doesn't render anything
}

