/**
 * Node-Based Template System - Type Definitions
 * Phase 1: Basic node types only (start simple, extend later)
 */

// ============================================================================
// Basic Node Types
// ============================================================================

export type NodeType = "text" | "image" | "shape" | "group";

export type ShapeType = "rectangle" | "circle";

export type ImageFitMode = "cover" | "contain" | "fill" | "none";

// ============================================================================
// Base Node Interface
// ============================================================================

export interface BaseNode {
  id: string;
  type: NodeType;
  
  // Geometry (required for all nodes)
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  
  // Optional rotation
  rotation?: number;
}

// ============================================================================
// Text Node (Basic)
// ============================================================================

export interface TextNode extends BaseNode {
  type: "text";
  
  // Text content
  content: string; // Placeholder text or bound value
  
  // Typography (basic)
  fontFamily: string;
  fontSize: number;
  fontWeight: number | string; // e.g., 400, "bold", "normal"
  lineHeight: number;
  textAlign: "left" | "center" | "right" | "justify";
  color: string; // Hex color or token reference
  
  // Binding (optional - links to form field)
  binding?: {
    field: string; // e.g., "eventTitle", "speaker[0].name"
    type: "text";
  };
  
  // Skip for now (add later):
  // - textShadow
  // - gradient
  // - maxLines, truncate, autoFit
  // - reflow rules
}

// ============================================================================
// Image Node (Basic)
// ============================================================================

export interface ImageNode extends BaseNode {
  type: "image";
  
  // Image source
  src?: string; // Placeholder URL or bound value
  
  // Fit mode
  fit: ImageFitMode;
  
  // Binding (optional - links to form field)
  binding?: {
    field: string; // e.g., "logo", "speaker[0].headshot"
    type: "image";
  };
  
  // Skip for now (add later):
  // - focalPoint
  // - mask (rounded, blob, custom)
  // - borderRadius
}

// ============================================================================
// Shape Node (Basic)
// ============================================================================

export interface ShapeNode extends BaseNode {
  type: "shape";
  
  // Shape type
  shapeType: ShapeType;
  
  // Styling
  fill?: string; // Hex color or token reference
  stroke?: {
    color: string; // Hex color or token reference
    width: number;
  };
  opacity?: number;
  
  // Skip for now (add later):
  // - custom paths (SVG paths)
  // - gradients
  // - shadows
  // - effects
}

// ============================================================================
// Group Node (Basic)
// ============================================================================

export interface GroupNode extends BaseNode {
  type: "group";
  
  // Children nodes
  children: TemplateNode[];
  
  // Skip for now (add later):
  // - layout type (flexbox, grid, etc.)
  // - layout constraints
}

// ============================================================================
// Union Type for All Nodes
// ============================================================================

export type TemplateNode = TextNode | ImageNode | ShapeNode | GroupNode;

// ============================================================================
// Variant Override (Basic - hide/show only)
// ============================================================================

export interface VariantOverride {
  nodeId: string;
  operation: "hide" | "show"; // Start simple, add move/resize/animate later
  
  // Skip for now (add later):
  // - move (x, y)
  // - resize (width, height)
  // - recolor
  // - animate
}

// ============================================================================
// Variant Definition (Basic)
// ============================================================================

export interface Variant {
  id: string;
  name: string;
  overrides: VariantOverride[];
}

// ============================================================================
// Color Token (Basic - colors only)
// ============================================================================

export interface ColorToken {
  name: string; // e.g., "primary", "secondary", "background"
  default: string; // Default hex color
  editable: boolean; // Can user change this?
  
  // Skip for now (add later):
  // - spacing tokens
  // - typography tokens
  // - shadow tokens
}

// ============================================================================
// Template Schema (Core Structure)
// ============================================================================

export interface TemplateSchema {
  // Metadata
  id: string;
  name: string;
  title: string;
  version: number; // Schema version for future migrations
  
  // Dimensions
  dimensions: {
    width: number;
    height: number;
  };
  
  // Node Graph (Source of Truth)
  nodes: TemplateNode[];
  
  // Color Tokens (Basic - colors only)
  tokens: {
    [key: string]: ColorToken;
  };
  
  // Variants (Basic - hide/show only)
  variants: Variant[];
  
  // Field Bindings (Simple field mappings)
  bindings: Array<{
    nodeId: string;
    field: string; // Form field name
    type: "text" | "image" | "color";
  }>;
  
  // Skip for now (add later):
  // - complex variant actions
  // - advanced tokens (spacing, typography)
  // - computed bindings
  // - conditional bindings
  // - array bindings
}

// ============================================================================
// Template Format (for dual-format support)
// ============================================================================

export type TemplateFormat = "node" | "html";

// ============================================================================
// Helper Type Guards
// ============================================================================

export function isTextNode(node: TemplateNode): node is TextNode {
  return node.type === "text";
}

export function isImageNode(node: TemplateNode): node is ImageNode {
  return node.type === "image";
}

export function isShapeNode(node: TemplateNode): node is ShapeNode {
  return node.type === "shape";
}

export function isGroupNode(node: TemplateNode): node is GroupNode {
  return node.type === "group";
}

