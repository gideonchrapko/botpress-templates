/**
 * Node-to-HTML Compiler V2
 * Phase 2: Hybrid layout system (flexbox + absolute positioning)
 * 
 * Compiles layout nodes (Frame, Flex, Box) to flexbox HTML
 * Preserves pixel-perfect rendering for Puppeteer
 */

import {
  TemplateNode,
  TemplateSchema,
  FrameNode,
  FlexNode,
  BoxNode,
  TextNode,
  ImageNode,
  SvgNode,
  ShapeNode,
  isFrameNode,
  isFlexNode,
  isBoxNode,
  isTextNode,
  isImageNode,
  isSvgNode,
  isShapeNode,
  isContainerNode,
} from "./node-types";

// ============================================================================
// Compiler Options
// ============================================================================

export interface CompilerOptions {
  data?: Record<string, any>;
  tokens?: Record<string, string>;
  variantId?: string;
}

// ============================================================================
// Main Compiler Function
// ============================================================================

export function compileNodeGraphToHTML(
  schema: TemplateSchema,
  options: CompilerOptions = {}
): string {
  const { data = {}, tokens = {}, variantId } = options;

  // Get root node (FrameNode or fallback to nodes array for legacy support)
  let root: FrameNode;
  if (schema.root) {
    root = schema.root;
  } else if (schema.nodes && schema.nodes.length > 0) {
    // Legacy: convert nodes array to FrameNode (absolute positioning)
    // Wrap in a frame with no padding for absolute positioning
    const legacyNodes = schema.nodes;
    root = {
      id: "root",
      type: "frame",
      width: schema.dimensions.width,
      height: schema.dimensions.height,
      padding: 0,
      backgroundColor: "#F4F4F4",
      overflow: "hidden",
      boxSizing: "border-box",
      children: legacyNodes,
    };
  } else {
    throw new Error("Template schema must have either root FrameNode or nodes array");
  }

  // Apply variant overrides
  if (variantId) {
    const variant = schema.variants.find(v => v.id === variantId);
    if (variant) {
      root = applyVariantOverridesToNode(root, variant) as FrameNode;
    }
  }

  // Resolve tokens
  root = resolveTokensInNode(root, tokens) as FrameNode;

  // Apply data bindings
  root = applyBindingsToNode(root, data, schema.bindings) as FrameNode;

  // Generate HTML
  return generateHTML(root, schema.dimensions);
}

// ============================================================================
// Variant Override Application
// ============================================================================

function applyVariantOverridesToNode(
  node: TemplateNode,
  variant: { overrides: Array<{ nodeId: string; operation: "hide" | "show" }> }
): TemplateNode {
  const override = variant.overrides.find(o => o.nodeId === node.id);
  if (override) {
    if (override.operation === "hide") {
      return { ...node, visible: false };
    }
    if (override.operation === "show") {
      return { ...node, visible: true };
    }
  }

  // Recursively apply to children
  if (isContainerNode(node)) {
    return {
      ...node,
      children: node.children.map(child => applyVariantOverridesToNode(child, variant)),
    };
  }

  return node;
}

// ============================================================================
// Token Resolution
// ============================================================================

function resolveTokensInNode(
  node: TemplateNode,
  resolvedTokens: Record<string, string>
): TemplateNode {
  let newNode = { ...node };

  // Resolve tokens in text nodes
  if (isTextNode(newNode)) {
    if (newNode.color?.startsWith("token:")) {
      const tokenName = newNode.color.substring(6);
      newNode.color = resolvedTokens[tokenName] || newNode.color;
    }
  }

  // Resolve tokens in shape nodes
  if (isShapeNode(newNode)) {
    if (newNode.fill?.startsWith("token:")) {
      const tokenName = newNode.fill.substring(6);
      newNode.fill = resolvedTokens[tokenName] || newNode.fill;
    }
    if (newNode.stroke?.color?.startsWith("token:")) {
      const tokenName = newNode.stroke.color.substring(6);
      newNode.stroke = {
        ...newNode.stroke,
        color: resolvedTokens[tokenName] || newNode.stroke.color,
      };
    }
  }

  // Resolve tokens in flex/box nodes (backgroundColor)
  if (isFlexNode(newNode) || isBoxNode(newNode)) {
    if (newNode.backgroundColor?.startsWith("token:")) {
      const tokenName = newNode.backgroundColor.substring(6);
      newNode.backgroundColor = resolvedTokens[tokenName] || newNode.backgroundColor;
    }
  }

  // Resolve tokens in frame node
  if (isFrameNode(newNode)) {
    if (newNode.backgroundColor?.startsWith("token:")) {
      const tokenName = newNode.backgroundColor.substring(6);
      newNode.backgroundColor = resolvedTokens[tokenName] || newNode.backgroundColor;
    }
  }

  // Recursively resolve in children
  if (isContainerNode(newNode)) {
    return {
      ...newNode,
      children: newNode.children.map(child => resolveTokensInNode(child, resolvedTokens)),
    };
  }

  return newNode;
}

// ============================================================================
// Data Binding Application
// ============================================================================

function applyBindingsToNode(
  node: TemplateNode,
  data: Record<string, any>,
  bindings: Array<{ nodeId: string; field: string; type: "text" | "image" | "color" }>
): TemplateNode {
  const binding = bindings.find(b => b.nodeId === node.id);

  if (binding) {
    const value = getNestedValue(data, binding.field);

    if (isTextNode(node) && binding.type === "text") {
      if (value === undefined || value === null) {
        console.warn(`Binding failed for node ${node.id}: field "${binding.field}" not found in data`);
        return node; // Keep original content if binding fails
      }
      return { ...node, content: String(value) };
    } else if (isImageNode(node) && binding.type === "image") {
      if (value === undefined || value === null) {
        console.warn(`Binding failed for node ${node.id}: field "${binding.field}" not found in data`);
        return node; // Keep original src if binding fails
      }
      return { ...node, src: String(value) };
    } else if (isSvgNode(node) && binding.type === "image") {
      if (value === undefined || value === null) {
        console.warn(`Binding failed for node ${node.id}: field "${binding.field}" not found in data`);
        return node; // Keep original imageHref if binding fails
      }
      return { ...node, imageHref: String(value) };
    } else if (isShapeNode(node) && binding.type === "color") {
      if (value === undefined || value === null) {
        console.warn(`Binding failed for node ${node.id}: field "${binding.field}" not found in data`);
        return node; // Keep original fill if binding fails
      }
      return { ...node, fill: String(value) };
    }
  }

  // Recursively apply to children
  if (isContainerNode(node)) {
    return {
      ...node,
      children: node.children.map(child => applyBindingsToNode(child, data, bindings)),
    };
  }

  return node;
}

function getNestedValue(obj: any, path: string): any {
  const parts = path.split(/[\.\[\]]/).filter(p => p);
  let current = obj;
  for (const part of parts) {
    if (current === undefined || current === null) {
      return undefined;
    }
    current = current[part];
  }
  return current;
}

// ============================================================================
// HTML Generation
// ============================================================================

function generateHTML(root: FrameNode, dimensions: { width: number; height: number }): string {
  const body = generateNodeHTML(root);
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Template</title>
</head>
<body style="margin: 0; padding: 0;">
  ${body}
</body>
</html>`;
}

function generateNodeHTML(node: TemplateNode): string {
  // Skip hidden nodes
  if (node.visible === false) {
    return "";
  }

  if (isFrameNode(node)) {
    return generateFrameHTML(node);
  } else if (isFlexNode(node)) {
    return generateFlexHTML(node);
  } else if (isBoxNode(node)) {
    return generateBoxHTML(node);
  } else if (isTextNode(node)) {
    return generateTextHTML(node);
  } else if (isImageNode(node)) {
    return generateImageHTML(node);
  } else if (isSvgNode(node)) {
    return generateSvgHTML(node);
  } else if (isShapeNode(node)) {
    return generateShapeHTML(node);
  }

  return "";
}

// ============================================================================
// Frame Node HTML
// ============================================================================

function generateFrameHTML(node: FrameNode): string {
  const styles: string[] = [
    `width: ${node.width}px`,
    `height: ${node.height}px`,
    `margin: 0`,
    `padding: ${formatPadding(node.padding)}`,
    `box-sizing: ${node.boxSizing || "border-box"}`,
    `overflow: ${node.overflow || "hidden"}`,
  ];

  if (node.backgroundColor) {
    styles.push(`background-color: ${node.backgroundColor}`);
  }

  const childrenHTML = node.children
    .map(child => generateNodeHTML(child))
    .filter(Boolean)
    .join("\n    ");

  return `<div id="node-${node.id}" style="${styles.join("; ")}">
    ${childrenHTML}
  </div>`;
}

// ============================================================================
// Flex Node HTML
// ============================================================================

function generateFlexHTML(node: FlexNode): string {
  const styles: string[] = [
    `display: flex`,
    `flex-direction: ${node.flexDirection}`,
    `width: ${node.width}px`,
    `height: ${node.height}px`,
  ];

  if (node.justifyContent) {
    styles.push(`justify-content: ${node.justifyContent}`);
  }
  if (node.alignItems) {
    styles.push(`align-items: ${node.alignItems}`);
  }
  if (node.gap !== undefined) {
    styles.push(`gap: ${node.gap}px`);
  }
  if (node.padding !== undefined) {
    styles.push(`padding: ${formatPadding(node.padding)}`);
  }
  if (node.boxSizing) {
    styles.push(`box-sizing: ${node.boxSizing}`);
  }
  if (node.backgroundColor) {
    styles.push(`background-color: ${node.backgroundColor}`);
  }

  const childrenHTML = node.children
    .map(child => generateNodeHTML(child))
    .filter(Boolean)
    .join("\n    ");

  return `<div id="node-${node.id}" style="${styles.join("; ")}">
    ${childrenHTML}
  </div>`;
}

// ============================================================================
// Box Node HTML
// ============================================================================

function generateBoxHTML(node: BoxNode): string {
  const styles: string[] = [
    `width: ${node.width}px`,
    `height: ${node.height}px`,
  ];

  if (node.padding !== undefined) {
    styles.push(`padding: ${formatPadding(node.padding)}`);
  }
  if (node.boxSizing) {
    styles.push(`box-sizing: ${node.boxSizing}`);
  }
  if (node.backgroundColor) {
    styles.push(`background-color: ${node.backgroundColor}`);
  }
  if (node.overflow) {
    styles.push(`overflow: ${node.overflow}`);
  }

  const childrenHTML = node.children
    .map(child => generateNodeHTML(child))
    .filter(Boolean)
    .join("\n    ");

  return `<div id="node-${node.id}" style="${styles.join("; ")}">
    ${childrenHTML}
  </div>`;
}

// ============================================================================
// Text Node HTML
// ============================================================================

function generateTextHTML(node: TextNode): string {
  const styles: string[] = [
    `font-family: ${node.fontFamily}`,
    `font-size: ${node.fontSize}px`,
    `font-weight: ${node.fontWeight}`,
    `line-height: ${node.lineHeight}`,
    `text-align: ${node.textAlign}`,
    `color: ${node.color}`,
  ];

  if (node.width !== undefined) {
    styles.push(`width: ${node.width}px`);
  }
  if (node.height !== undefined) {
    styles.push(`height: ${node.height}px`);
  }
  if (node.marginBottom !== undefined) {
    styles.push(`margin-bottom: ${node.marginBottom}px`);
  }
  if (node.marginTop !== undefined) {
    styles.push(`margin-top: ${node.marginTop}px`);
  }

  // If absolute positioned
  if (node.x !== undefined && node.y !== undefined) {
    styles.push(`position: absolute`, `left: ${node.x}px`, `top: ${node.y}px`);
    if (node.zIndex !== undefined) {
      styles.push(`z-index: ${node.zIndex}`);
    }
  }

  const content = escapeHTML(node.content);

  // Use div for block-level text, span for inline
  const tag = node.width && node.width >= 200 ? "div" : "span";
  return `<${tag} id="node-${node.id}" style="${styles.join("; ")}">${content}</${tag}>`;
}

// ============================================================================
// Image Node HTML
// ============================================================================

function generateImageHTML(node: ImageNode): string {
  const styles: string[] = [];

  if (node.width !== undefined && node.width !== null) {
    styles.push(`width: ${node.width}px`);
  }
  if (node.height !== undefined && node.height !== null) {
    styles.push(`height: ${node.height}px`);
  }
  if (node.display) {
    styles.push(`display: ${node.display}`);
  }

  // If absolute positioned
  if (node.x !== undefined && node.y !== undefined) {
    styles.push(`position: absolute`, `left: ${node.x}px`, `top: ${node.y}px`);
    if (node.zIndex !== undefined) {
      styles.push(`z-index: ${node.zIndex}`);
    }
  }

  const imgStyles: string[] = [];
  if (node.fit) {
    imgStyles.push(`object-fit: ${node.fit}`);
  }
  
  // For images with auto height, use height: auto on img, not 100%
  if (node.height === null || node.height === undefined) {
    imgStyles.push(`width: 100%`, `height: auto`);
  } else {
    imgStyles.push(`width: 100%`, `height: 100%`);
  }

  return `<div id="node-${node.id}" style="${styles.join("; ")}">
    <img src="${escapeHTML(node.src || "")}" alt="" style="${imgStyles.join("; ")}" />
  </div>`;
}

// ============================================================================
// SVG Node HTML
// ============================================================================

function generateSvgHTML(node: SvgNode): string {
  const styles: string[] = [];

  if (node.height !== undefined && node.height !== null) {
    styles.push(`height: ${node.height}px`);
  }
  if (node.width !== undefined && node.width !== null) {
    styles.push(`width: ${node.width}px`);
  }
  styles.push(`display: block`);

  // If absolute positioned
  if (node.x !== undefined && node.y !== undefined) {
    styles.push(`position: absolute`, `left: ${node.x}px`, `top: ${node.y}px`);
    if (node.zIndex !== undefined) {
      styles.push(`z-index: ${node.zIndex}`);
    }
  }

  const maskId = node.mask ? `speakerMask-${node.id}` : undefined;
  const imageHref = escapeHTML(node.imageHref || "");

  let svgContent = "";
  if (node.mask) {
    svgContent = `
      <defs>
        <mask id="${maskId}">
          <rect width="100%" height="100%" fill="black"/>
          <path d="${node.mask.path}" fill="white"/>
        </mask>
      </defs>
      <image href="${imageHref}" width="100%" height="100%" preserveAspectRatio="${node.imagePreserveAspectRatio || "xMidYMid slice"}" mask="url(#${maskId})"/>
    `;
  } else {
    svgContent = `<image href="${imageHref}" width="100%" height="100%" preserveAspectRatio="${node.imagePreserveAspectRatio || "xMidYMid slice"}"/>`;
  }

  return `<div id="node-${node.id}" style="${styles.join("; ")}">
    <svg style="height: 100%; width: auto; display: block;" viewBox="${node.viewBox}" preserveAspectRatio="${node.preserveAspectRatio || "xMidYMid meet"}">
      ${svgContent}
    </svg>
  </div>`;
}

// ============================================================================
// Shape Node HTML
// ============================================================================

function generateShapeHTML(node: ShapeNode): string {
  const styles: string[] = [
    `width: ${node.width}px`,
    `height: ${node.height}px`,
  ];

  if (node.fill) {
    styles.push(`background-color: ${node.fill}`);
  }
  if (node.stroke) {
    styles.push(`border: ${node.stroke.width}px solid ${node.stroke.color}`);
  }
  if (node.shapeType === "circle") {
    styles.push(`border-radius: 50%`);
  }
  if (node.opacity !== undefined) {
    styles.push(`opacity: ${node.opacity}`);
  }

  // If absolute positioned
  if (node.x !== undefined && node.y !== undefined) {
    styles.push(`position: absolute`, `left: ${node.x}px`, `top: ${node.y}px`);
    if (node.zIndex !== undefined) {
      styles.push(`z-index: ${node.zIndex}`);
    }
  }

  return `<div id="node-${node.id}" style="${styles.join("; ")}"></div>`;
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatPadding(padding: number | { top?: number; right?: number; bottom?: number; left?: number } | undefined): string {
  if (padding === undefined) {
    return "0";
  }
  if (typeof padding === "number") {
    return `${padding}px`;
  }
  const top = padding.top ?? 0;
  const right = padding.right ?? 0;
  const bottom = padding.bottom ?? 0;
  const left = padding.left ?? 0;
  return `${top}px ${right}px ${bottom}px ${left}px`;
}

function escapeHTML(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

