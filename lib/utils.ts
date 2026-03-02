import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Lightens a hex color by a fixed percentage
 */
export function lightenColor(hex: string, percent: number = 15): string {
  // Remove # if present
  hex = hex.replace("#", "");
  
  // Convert to RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // Convert to HSL
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;
  
  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  let h = 0, s = 0, l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case rNorm: h = ((gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0)) / 6; break;
      case gNorm: h = ((bNorm - rNorm) / d + 2) / 6; break;
      case bNorm: h = ((rNorm - gNorm) / d + 4) / 6; break;
    }
  }
  
  // Lighten
  l = Math.min(1, l + (percent / 100));
  
  // Convert back to RGB
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h * 6) % 2 - 1));
  const m = l - c / 2;
  
  let rNew = 0, gNew = 0, bNew = 0;
  
  if (h < 1/6) {
    rNew = c; gNew = x; bNew = 0;
  } else if (h < 2/6) {
    rNew = x; gNew = c; bNew = 0;
  } else if (h < 3/6) {
    rNew = 0; gNew = c; bNew = x;
  } else if (h < 4/6) {
    rNew = 0; gNew = x; bNew = c;
  } else if (h < 5/6) {
    rNew = x; gNew = 0; bNew = c;
  } else {
    rNew = c; gNew = 0; bNew = x;
  }
  
  rNew = Math.round((rNew + m) * 255);
  gNew = Math.round((gNew + m) * 255);
  bNew = Math.round((bNew + m) * 255);
  
  return `#${[rNew, gNew, bNew].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  }).join("")}`;
}

/**
 * Determines if text should be white or black based on background color
 */
export function getContrastColor(hex: string): string {
  hex = hex.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  return luminance > 0.5 ? "#000000" : "#FFFFFF";
}

