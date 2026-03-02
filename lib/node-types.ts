/**
 * Node-Based Template System - Type Definitions
 * Phase 2: Hybrid layout system (flexbox + absolute positioning)
 */

// ============================================================================
// Basic Node Types
// ============================================================================

export type NodeType = "frame" | "flex" | "box" | "text" | "image" | "shape" | "svg" | "group";

export type ShapeType = "rectangle" | "circle";

export type ImageFitMode = "cover" | "contain" | "fill" | "none";

export type FlexDirection = "row" | "column";
export type JustifyContent = "flex-start" | "flex-end" | "center" | "space-between" | "space-around" | "space-evenly";
export type AlignItems = "flex-start" | "flex-end" | "center" | "stretch" | "baseline";

// ============================================================================
// Base Node Interface (for absolute-positioned nodes)
// ============================================================================

export interface BaseNode {
  id: string;
  type: NodeType;
  
  // Geometry (for absolute positioning or explicit sizing)
  x?: number; // Optional - only for absolute positioning
  y?: number; // Optional - only for absolute positioning
  width: number;
  height: number;
  zIndex?: number;
  
  // Optional rotation
  rotation?: number;
  opacity?: number;
  visible?: boolean; // For variant overrides
}

// ============================================================================
// Frame Node (Root Container)
// ============================================================================

export interface FrameNode {
  id: string;
  type: "frame";
  
  // Canvas dimensions
  width: number;
  height: number;
  
  // Styling
  padding?: number | { top?: number; right?: number; bottom?: number; left?: number };
  backgroundColor?: string;
  overflow?: "visible" | "hidden" | "scroll" | "auto";
  boxSizing?: "border-box" | "content-box";
  
  // Variant support
  visible?: boolean;
  
  // Children (layout nodes)
  children: TemplateNode[];
}

// ============================================================================
// Flex Node (Flexbox Container)
// ============================================================================

export interface FlexNode extends BaseNode {
  type: "flex";
  
  // Flex properties
  flexDirection: FlexDirection;
  justifyContent?: JustifyContent;
  alignItems?: AlignItems;
  gap?: number;
  
  // Container styling
  padding?: number | { top?: number; right?: number; bottom?: number; left?: number };
  backgroundColor?: string;
  boxSizing?: "border-box" | "content-box";
  
  // Children (can be any node type)
  children: TemplateNode[];
}

// ============================================================================
// Box Node (Block Container)
// ============================================================================

export interface BoxNode extends BaseNode {
  type: "box";
  
  // Container styling
  padding?: number | { top?: number; right?: number; bottom?: number; left?: number };
  backgroundColor?: string;
  boxSizing?: "border-box" | "content-box";
  overflow?: "visible" | "hidden" | "scroll" | "auto";
  
  // Children
  children: TemplateNode[];
}

// ============================================================================
// Text Node (Leaf Node)
// ============================================================================

export interface TextNode extends BaseNode {
  type: "text";
  
  // Text content
  content: string; // Placeholder text or bound value
  
  // Typography
  fontFamily: string;
  fontSize: number;
  fontWeight: number | string; // e.g., 400, "bold", "normal"
  lineHeight: number;
  textAlign: "left" | "center" | "right" | "justify";
  color: string; // Hex color or token reference
  
  // Spacing (for in-flow layout)
  marginBottom?: number;
  marginTop?: number;
  
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
// Image Node (Leaf Node)
// ============================================================================

export interface ImageNode extends Omit<BaseNode, 'height'> {
  type: "image";
  
  // Image source
  src?: string; // Placeholder URL or bound value
  
  // Fit mode
  fit?: ImageFitMode;
  
  // Display
  display?: "block" | "inline" | "inline-block";
  
  // Height can be null for auto
  height: number | null;
  
  // Binding (optional - links to form field)
  binding?: {
    field: string; // e.g., "logo", "speaker[0].headshot"
    type: "image";
  };
  
  // Skip for now (add later):
  // - focalPoint
  // - borderRadius
}

// ============================================================================
// SVG Node (Leaf Node - for masked images)
// ============================================================================

export interface SvgNode extends BaseNode {
  type: "svg";
  
  // SVG properties
  viewBox: string; // e.g., "0 0 493 476"
  preserveAspectRatio?: string; // e.g., "xMidYMid meet" or "xMidYMid slice"
  
  // Mask definition (optional)
  mask?: {
    id: string;
    path: string; // SVG path for mask
  };
  
  // Image inside SVG
  imageHref?: string; // URL or bound value
  imagePreserveAspectRatio?: string; // e.g., "xMidYMid slice"
  
  // Binding (optional - links to form field)
  binding?: {
    field: string; // e.g., "people[0].headshot"
    type: "image";
  };
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
// Group Node (Legacy - for backwards compatibility)
// ============================================================================

export interface GroupNode extends BaseNode {
  type: "group";
  
  // Children nodes
  children: TemplateNode[];
}

// ============================================================================
// Union Type for All Nodes
// ============================================================================

export type TemplateNode = FrameNode | FlexNode | BoxNode | TextNode | ImageNode | ShapeNode | SvgNode | GroupNode;

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
  // Root FrameNode (preferred for layout-based templates)
  root?: FrameNode;
  
  // Legacy support: nodes array for absolute-positioned templates
  nodes?: TemplateNode[];
  
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

export function isFrameNode(node: TemplateNode): node is FrameNode {
  return node.type === "frame";
}

export function isFlexNode(node: TemplateNode): node is FlexNode {
  return node.type === "flex";
}

export function isBoxNode(node: TemplateNode): node is BoxNode {
  return node.type === "box";
}

export function isTextNode(node: TemplateNode): node is TextNode {
  return node.type === "text";
}

export function isImageNode(node: TemplateNode): node is ImageNode {
  return node.type === "image";
}

export function isSvgNode(node: TemplateNode): node is SvgNode {
  return node.type === "svg";
}

export function isShapeNode(node: TemplateNode): node is ShapeNode {
  return node.type === "shape";
}

export function isGroupNode(node: TemplateNode): node is GroupNode {
  return node.type === "group";
}

export function isContainerNode(node: TemplateNode): node is FrameNode | FlexNode | BoxNode | GroupNode {
  return node.type === "frame" || node.type === "flex" || node.type === "box" || node.type === "group";
}

