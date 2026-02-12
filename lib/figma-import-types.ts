/**
 * Figma Import Types - MVP for Phase 3
 * Basic structure for importing simple templates from Figma
 */

export interface FigmaExportNode {
  id: string;
  name: string;
  type: "TEXT" | "RECTANGLE" | "FRAME" | "GROUP" | "VECTOR" | "ELLIPSE" | "COMPONENT" | "INSTANCE";
  x: number;
  y: number;
  width: number;
  height: number;
  
  // Text properties
  characters?: string;
  style?: {
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: number;
    textAlign?: "LEFT" | "CENTER" | "RIGHT";
    fill?: string; // Hex color
  };
  
  // Image/vector properties
  fills?: Array<{
    type: "SOLID" | "IMAGE";
    color?: { r: number; g: number; b: number; a: number };
    imageRef?: string; // Reference to exported image
  }>;
  
  // Binding detection from layer names
  // Layer names like "{{eventTitle}}" or "{{logo}}" will be detected
  binding?: string; // Extracted from name if matches {{fieldName}} pattern
  
  // Children (for groups/frames)
  children?: FigmaExportNode[];
}

export interface FigmaExport {
  name: string;
  width: number;
  height: number;
  nodes: FigmaExportNode[];
  images?: Record<string, string>; // imageRef -> base64 data URI
}

export interface FigmaImportResult {
  templateId: string;
  templatePath: string;
  configPath: string;
  htmlPath: string;
  message: string;
}
