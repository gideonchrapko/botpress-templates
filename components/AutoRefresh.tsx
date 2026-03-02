"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export function AutoRefresh({ 
  hasOutputs, 
  submissionId 
}: { 
  hasOutputs: boolean; 
  submissionId: string;
}) {
  const router = useRouter();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isCheckingRef = useRef(false);

  useEffect(() => {
    // If outputs already exist, don't poll
    if (hasOutputs) {
      return;
    }

    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Start polling only if no outputs
    intervalRef.current = setInterval(async () => {
      // Prevent concurrent requests
      if (isCheckingRef.current) {
        return;
      }

      isCheckingRef.current = true;
      try {
        const response = await fetch(`/api/submission/${submissionId}`, {
          cache: 'no-store', // Prevent caching
        });
        if (response.ok) {
          const data = await response.json();
          if (data.outputs && Array.isArray(data.outputs) && data.outputs.length > 0) {
            // Outputs are ready, refresh the page and stop polling
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            router.refresh();
          }
        }
      } catch (error) {
        // Silently fail, will retry on next interval
        console.error("AutoRefresh polling error:", error);
      } finally {
        isCheckingRef.current = false;
      }
    }, 5000); // Increased to 5 seconds to reduce CPU usage

    // Cleanup interval on unmount or when dependencies change
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      isCheckingRef.current = false;
    };
  }, [hasOutputs, submissionId, router]);

  return null; // This component doesn't render anything
}


