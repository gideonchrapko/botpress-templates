/**
 * Blog Image Generator Rules
 * 
 * These rules define how components are selected and composed for blog images.
 * Extracted from the Figma plugin to be shared between plugin and web app.
 * 
 * This is the source of truth for component selection logic.
 */

export const AI_RULES = {
  // Background layout rules
  backgroundRules: {
    'bg-one': { 
      maxSupporting: 2, 
      positions: ['top-left', 'custom-bg-one-2'] as const,
      description: 'Simple layout with 2 supporting images: one at top-left, one at (250,750) sized 250x250'
    },
    'bg-two': { 
      maxSupporting: 1, 
      positions: ['top-right'] as const,
      description: 'Balanced layout with 1 supporting graphic at top-right'
    },
    'bg-three': { 
      maxSupporting: 0, 
      positions: [] as const,
      description: 'Simple layout with no supporting graphics'
    },
    'bg-four': { 
      maxSupporting: 2, 
      positions: ['top-mid-left', 'bottom-mid-left'] as const,
      description: 'Left layout with two smaller supporting graphics'
    }
  },
  
  // Main image compatibility rules
  mainImageRules: {
    'main-illustration': ['bg-one', 'bg-two'] as const, // NOT bg-four - logos get bg-four
    'main-3d': ['bg-three'] as const,
    'main-logo': ['bg-four'] as const
  },
  
  // Main illustration positioning and sizing rules
  mainIllustrationRules: {
    'bg-one': { x: 650, y: 150, width: 700, height: 700 },
    'bg-two': { x: 144, y: 150, width: 700, height: 700 },
    'bg-four': { x: 624, y: 175, width: 650, height: 650 },
    'bg-three': { x: 375, y: 125, width: 750, height: 750 } // Centered for 3D images
  },

  // Additional design guidelines
  designGuidelines: [
    'Main illustrations work best with bg-one and bg-two backgrounds',
    '3D graphics work best with bg-three (centered, no supporting graphics)',
    'Logos work best with bg-four (left-aligned layout)',
    'Supporting graphics should complement, not compete with main image',
    'Use color harmony between background and supporting graphics'
  ],

  // Component size guidelines
  componentSizes: {
    mainIllustration: { width: 700, height: 700 },
    supportingGraphic: { width: 500, height: 500 },
    supportingGraphicSmall: { width: 375, height: 375 } // For bg-four
  }
} as const;

/**
 * Get positions for supporting images based on background type
 */
export function getPositionsForBackground(bgType: string): Array<{ x: number; y: number; customSize?: { width: number; height: number } }> {
  // Match exact coordinates from Figma plugin code
  if (bgType === 'bg-one') {
    return [
      { x: 0, y: 0 }, // top-left - matches plugin's 'top-left' position
      { x: 250, y: 750, customSize: { width: 250, height: 250 } } // custom-bg-one-2 - matches plugin exactly
    ];
  }
  if (bgType === 'bg-two') {
    return [
      { x: 1000, y: 0 } // top-right - matches plugin's 'top-right' position
    ];
  }
  if (bgType === 'bg-three') {
    return []; // No supporting images
  }
  if (bgType === 'bg-four') {
    return [
      { x: 0, y: 125 }, // top-mid-left - matches plugin exactly
      { x: 0, y: 500 } // bottom-mid-left - matches plugin exactly
    ];
  }
  return [];
}

/**
 * Get allowed background types for a main image
 */
export function getAllowedBackgroundsForMain(mainName: string): string[] {
  // Check for prefix match
  if (mainName.startsWith('main-illustration')) {
    return [...AI_RULES.mainImageRules['main-illustration']];
  }
  if (mainName.startsWith('main-3d')) {
    return [...AI_RULES.mainImageRules['main-3d']];
  }
  if (mainName.startsWith('main-logo')) {
    return [...AI_RULES.mainImageRules['main-logo']];
  }
  return [];
}

/**
 * Template selection result
 */
export interface TemplateSelection {
  background: string;
  mainImage: string;
  supportingImages: string[];
  layout: string;
  reasoning: string;
}

/**
 * Component information
 */
export interface ComponentInfo {
  id: string;
  name: string;
  type: 'background' | 'main' | 'supporting' | 'grid';
  description?: string;
  imageUrl?: string; // URL to component image (from Figma API or stored asset)
  figmaFileId?: string; // Figma file ID if using Figma API
  figmaNodeId?: string; // Figma node ID if using Figma API
  gridNodeId?: string; // Grid layer node ID (for backgrounds that contain a Grid layer)
  gridImageUrl?: string; // Grid layer image URL (fetched separately)
}
