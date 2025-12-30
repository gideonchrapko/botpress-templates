/**
 * Node-to-HTML Compiler
 * Phase 1: Basic compilation with absolute positioning
 * 
 * Converts node graph → HTML string for Puppeteer rendering
 */

import { TemplateNode, TemplateSchema, isTextNode, isImageNode, isShapeNode, isGroupNode } from "./node-types";

// ============================================================================
// Compiler Options
// ============================================================================

export interface CompilerOptions {
  // Data to bind to nodes
  data?: Record<string, any>;
  
  // Token values (resolved colors)
  tokens?: Record<string, string>;
  
  // Variant to apply
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
  
  // Apply variant overrides if specified
  let nodes = schema.nodes;
  if (variantId) {
    const variant = schema.variants.find(v => v.id === variantId);
    if (variant) {
      nodes = applyVariantOverrides(nodes, variant);
    }
  }
  
  // Resolve tokens in nodes
  nodes = resolveTokens(nodes, tokens);
  
  // Apply data bindings
  nodes = applyBindings(nodes, data, schema.bindings);
  
  // Generate HTML
  const html = generateHTML(nodes, schema.dimensions);
  
  return html;
}

// ============================================================================
// Variant Override Application
// ============================================================================

function applyVariantOverrides(
  nodes: TemplateNode[],
  variant: { overrides: Array<{ nodeId: string; operation: "hide" | "show" }> }
): TemplateNode[] {
  const hiddenNodeIds = new Set<string>();
  
  // Process overrides
  for (const override of variant.overrides) {
    if (override.operation === "hide") {
      hiddenNodeIds.add(override.nodeId);
    } else if (override.operation === "show") {
      hiddenNodeIds.delete(override.nodeId);
    }
  }
  
  // Filter out hidden nodes (recursively for groups)
  return filterNodes(nodes, hiddenNodeIds);
}

function filterNodes(nodes: TemplateNode[], hiddenIds: Set<string>): TemplateNode[] {
  return nodes
    .filter(node => !hiddenIds.has(node.id))
    .map(node => {
      if (isGroupNode(node)) {
        return {
          ...node,
          children: filterNodes(node.children, hiddenIds),
        };
      }
      return node;
    });
}

// ============================================================================
// Token Resolution
// ============================================================================

function resolveTokens(nodes: TemplateNode[], tokens: Record<string, string>): TemplateNode[] {
  return nodes.map(node => {
    if (isTextNode(node)) {
      return {
        ...node,
        color: resolveTokenValue(node.color, tokens),
      };
    } else if (isShapeNode(node)) {
      return {
        ...node,
        fill: node.fill ? resolveTokenValue(node.fill, tokens) : undefined,
        stroke: node.stroke ? {
          ...node.stroke,
          color: resolveTokenValue(node.stroke.color, tokens),
        } : undefined,
      };
    } else if (isGroupNode(node)) {
      return {
        ...node,
        children: resolveTokens(node.children, tokens),
      };
    }
    return node;
  });
}

function resolveTokenValue(value: string, tokens: Record<string, string>): string {
  // If value starts with "token:", treat as token reference
  if (value.startsWith("token:")) {
    const tokenName = value.slice(6);
    return tokens[tokenName] || value;
  }
  // Otherwise, return as-is (hex color or other value)
  return value;
}

// ============================================================================
// Data Binding Application
// ============================================================================

function applyBindings(
  nodes: TemplateNode[],
  data: Record<string, any>,
  bindings: Array<{ nodeId: string; field: string; type: string }>
): TemplateNode[] {
  const bindingMap = new Map(bindings.map(b => [b.nodeId, b]));
  
  return nodes.map(node => {
    const binding = bindingMap.get(node.id);
    
    if (binding) {
      const value = getNestedValue(data, binding.field);
      
      if (isTextNode(node) && binding.type === "text") {
        return { ...node, content: value || node.content };
      } else if (isImageNode(node) && binding.type === "image") {
        return { ...node, src: value || node.src };
      } else if (isShapeNode(node) && binding.type === "color") {
        return { ...node, fill: value || node.fill };
      }
    }
    
    if (isGroupNode(node)) {
      return {
        ...node,
        children: applyBindings(node.children, data, bindings),
      };
    }
    
    return node;
  });
}

function getNestedValue(obj: any, path: string): any {
  const parts = path.split(/[\.\[\]]/).filter(p => p);
  let value = obj;
  for (const part of parts) {
    if (value == null) return undefined;
    value = value[part];
  }
  return value;
}

// ============================================================================
// HTML Generation
// ============================================================================

function generateHTML(nodes: TemplateNode[], dimensions: { width: number; height: number }): string {
  const styles = generateStyles(nodes, dimensions);
  const body = generateBody(nodes);
  
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      width: ${dimensions.width}px;
      height: ${dimensions.height}px;
      position: relative;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    ${styles}
  </style>
</head>
<body>
  ${body}
</body>
</html>`;
}

function generateStyles(nodes: TemplateNode[], dimensions: { width: number; height: number }): string {
  return nodes.map(node => generateNodeStyles(node)).join("\n    ");
}

function generateNodeStyles(node: TemplateNode): string {
  const baseStyles = `
    #node-${node.id} {
      position: absolute;
      left: ${node.x}px;
      top: ${node.y}px;
      width: ${node.width}px;
      height: ${node.height}px;
      z-index: ${node.zIndex};
      ${node.rotation ? `transform: rotate(${node.rotation}deg);` : ""}
    }`;
  
  if (isTextNode(node)) {
    return baseStyles + `
    #node-${node.id} {
      font-family: ${node.fontFamily};
      font-size: ${node.fontSize}px;
      font-weight: ${node.fontWeight};
      line-height: ${node.lineHeight};
      text-align: ${node.textAlign};
      color: ${node.color};
    }`;
  } else if (isImageNode(node)) {
    return baseStyles + `
    #node-${node.id} img {
      width: 100%;
      height: 100%;
      object-fit: ${node.fit};
    }`;
  } else if (isShapeNode(node)) {
    const borderRadius = node.shapeType === "circle" ? "50%" : "0";
    return baseStyles + `
    #node-${node.id} {
      background-color: ${node.fill || "transparent"};
      ${node.stroke ? `border: ${node.stroke.width}px solid ${node.stroke.color};` : ""}
      border-radius: ${borderRadius};
      opacity: ${node.opacity ?? 1};
    }`;
  }
  
  return baseStyles;
}

function generateBody(nodes: TemplateNode[]): string {
  return nodes.map(node => generateNodeHTML(node)).join("\n  ");
}

function generateNodeHTML(node: TemplateNode): string {
  if (isTextNode(node)) {
    return `<div id="node-${node.id}">${escapeHTML(node.content)}</div>`;
  } else if (isImageNode(node)) {
    return `<div id="node-${node.id}"><img src="${escapeHTML(node.src || "")}" alt="" /></div>`;
  } else if (isShapeNode(node)) {
    return `<div id="node-${node.id}"></div>`;
  } else if (isGroupNode(node)) {
    const children = node.children.map(child => generateNodeHTML(child)).join("\n    ");
    return `<div id="node-${node.id}">\n    ${children}\n  </div>`;
  }
  return "";
}

function escapeHTML(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

