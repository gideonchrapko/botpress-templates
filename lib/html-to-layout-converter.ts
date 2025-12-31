/**
 * HTML to Layout Node Converter
 * Phase 2: Maps HTML structure to layout nodes (Frame, Flex, Box)
 * 
 * Preserves flexbox structure instead of converting to absolute positioning
 */

import { readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import {
  FrameNode,
  FlexNode,
  BoxNode,
  TextNode,
  ImageNode,
  SvgNode,
  TemplateSchema,
  TemplateNode,
} from "./node-types";
import { TemplateConfig } from "./template-registry";

// ============================================================================
// Helper: Parse inline styles
// ============================================================================

interface ParsedStyles {
  width?: number;
  height?: number;
  padding?: number | { top?: number; right?: number; bottom?: number; left?: number };
  margin?: number;
  backgroundColor?: string;
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
  lineHeight?: number;
  textAlign?: "left" | "center" | "right" | "justify";
  display?: string;
  flexDirection?: "row" | "column";
  justifyContent?: string;
  alignItems?: string;
  boxSizing?: string;
  overflow?: string;
  marginBottom?: number;
  marginTop?: number;
}

function parseInlineStyles(styleAttr: string): ParsedStyles {
  const styles: ParsedStyles = {};
  const pairs = styleAttr.split(";").filter(s => s.trim());

  for (const pair of pairs) {
    const [key, value] = pair.split(":").map(s => s.trim());
    if (!key || !value) continue;

    switch (key) {
      case "width":
        styles.width = parseFloat(value);
        break;
      case "height":
        if (value.includes("calc")) {
          // Handle calc() - for now, approximate
          const match = value.match(/calc\(100%\s*-\s*(\d+)px\)/);
          if (match) {
            styles.height = parseFloat(match[1]);
          }
        } else {
          styles.height = parseFloat(value);
        }
        break;
      case "padding":
        const paddingMatch = value.match(/(\d+)px/);
        if (paddingMatch) {
          styles.padding = parseFloat(paddingMatch[1]);
        }
        break;
      case "background-color":
        styles.backgroundColor = value;
        break;
      case "color":
        styles.color = value;
        break;
      case "font-size":
        styles.fontSize = parseFloat(value);
        break;
      case "font-family":
        styles.fontFamily = value.replace(/['"]/g, "");
        break;
      case "font-weight":
        styles.fontWeight = value === "bold" ? "bold" : parseFloat(value) || value;
        break;
      case "line-height":
        styles.lineHeight = parseFloat(value);
        break;
      case "text-align":
        styles.textAlign = value as any;
        break;
      case "display":
        styles.display = value;
        break;
      case "flex-direction":
        styles.flexDirection = value as "row" | "column";
        break;
      case "justify-content":
        styles.justifyContent = value;
        break;
      case "align-items":
        styles.alignItems = value;
        break;
      case "box-sizing":
        styles.boxSizing = value;
        break;
      case "overflow":
        styles.overflow = value;
        break;
      case "margin-bottom":
        styles.marginBottom = parseFloat(value);
        break;
      case "margin-top":
        styles.marginTop = parseFloat(value);
        break;
    }
  }

  return styles;
}

// ============================================================================
// Extract text content from HTML
// ============================================================================

function extractTextContent(html: string, pattern: string): string | null {
  const regex = new RegExp(`<[^>]*>([^<]*${pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^<]*)</[^>]*>`, "i");
  const match = html.match(regex);
  if (match) {
    return match[1].replace(/<[^>]*>/g, "").trim();
  }
  return null;
}

// ============================================================================
// Extract image src from HTML
// ============================================================================

function extractImageSrc(html: string, pattern: string): string | null {
  const regex = new RegExp(`<img[^>]*src="([^"]*${pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^"]*)"[^>]*>`, "i");
  const match = html.match(regex);
  return match ? match[1] : null;
}

// ============================================================================
// Extract SVG structure
// ============================================================================

function extractSvgStructure(html: string): {
  viewBox: string;
  preserveAspectRatio: string;
  maskPath: string | null;
  imageHref: string | null;
} | null {
  const svgMatch = html.match(/<svg[^>]*viewBox="([^"]*)"[^>]*preserveAspectRatio="([^"]*)"[^>]*>([\s\S]*?)<\/svg>/i);
  if (!svgMatch) return null;

  const maskMatch = svgMatch[3].match(/<path[^>]*d="([^"]*)"[^>]*fill="white"[^>]*>/i);
  const imageMatch = svgMatch[3].match(/<image[^>]*href="([^"]*)"[^>]*>/i);

  return {
    viewBox: svgMatch[1],
    preserveAspectRatio: svgMatch[2],
    maskPath: maskMatch ? maskMatch[1] : null,
    imageHref: imageMatch ? imageMatch[1] : null,
  };
}

// ============================================================================
// Convert HTML to Layout Nodes
// ============================================================================

// Re-export from v3 (parse5-based parser)
export { convertHTMLToLayoutNodes } from "./html-to-layout-converter-v3";

// Legacy function - kept for backwards compatibility
export async function convertHTMLToLayoutNodes_OLD(
  templateFamily: string,
  variantNumber: string,
  config: TemplateConfig
): Promise<TemplateSchema | null> {
  const templatePath = join(process.cwd(), "templates", templateFamily, `template-${variantNumber}.html`);

  if (!existsSync(templatePath)) {
    return null;
  }

  const html = await readFile(templatePath, "utf-8");

  // Parse HTML structure
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (!bodyMatch) return null;

  const bodyContent = bodyMatch[1];

  // Find root container div
  const rootDivMatch = bodyContent.match(/<div[^>]*style="([^"]*)"[^>]*>([\s\S]*?)<\/div>/);
  if (!rootDivMatch) return null;

  const rootStyles = parseInlineStyles(rootDivMatch[1]);
  const rootContent = rootDivMatch[2];

  // Create FrameNode (root)
  const frame: FrameNode = {
    id: "root",
    type: "frame",
    width: rootStyles.width || config.width,
    height: rootStyles.height || config.height,
    padding: rootStyles.padding || 80,
    backgroundColor: rootStyles.backgroundColor || "#F4F4F4",
    overflow: (rootStyles.overflow as any) || "hidden",
    boxSizing: (rootStyles.boxSizing as any) || "border-box",
    children: [],
  };

  // Parse children recursively
  frame.children = parseChildren(rootContent, config);

  // Create bindings from config
  const bindings = createBindings(frame, config);

  // Create tokens
  const tokens: Record<string, { name: string; default: string; editable: boolean }> = {
    primary: {
      name: "primary",
      default: config.fields.find(f => f.name === "primaryColor")?.default || "#3D9DFF",
      editable: true,
    },
    secondary: {
      name: "secondary",
      default: "#B5DAFF",
      editable: true,
    },
  };

  // Create schema
  const schema: TemplateSchema = {
    id: `${templateFamily}-${variantNumber}`,
    name: templateFamily,
    title: config.name,
    version: 2, // Version 2 for layout nodes
    dimensions: {
      width: config.width,
      height: config.height,
    },
    root: frame,
    tokens,
    variants: [],
    bindings,
  };

  return schema;
}

// ============================================================================
// Parse children recursively
// ============================================================================

function parseChildren(html: string, config: TemplateConfig): TemplateNode[] {
  const nodes: TemplateNode[] = [];

  // Match all top-level divs
  const divRegex = /<div[^>]*style="([^"]*)"[^>]*>([\s\S]*?)<\/div>/gi;
  let match;

  while ((match = divRegex.exec(html)) !== null) {
    const styles = parseInlineStyles(match[1]);
    const content = match[2];

    // Check if it's a flex container
    if (styles.display === "flex") {
      const flexNode: FlexNode = {
        id: `flex-${nodes.length}`,
        type: "flex",
        width: styles.width || 920,
        height: styles.height || 100,
        flexDirection: styles.flexDirection || "row",
        justifyContent: (styles.justifyContent as any) || "flex-start",
        alignItems: (styles.alignItems as any) || "stretch",
        padding: styles.padding,
        backgroundColor: styles.backgroundColor,
        boxSizing: (styles.boxSizing as any) || "border-box",
        children: parseChildren(content, config),
      };
      nodes.push(flexNode);
    } else {
      // Regular box container
      const boxNode: BoxNode = {
        id: `box-${nodes.length}`,
        type: "box",
        width: styles.width || 920,
        height: styles.height || 100,
        padding: styles.padding,
        backgroundColor: styles.backgroundColor,
        boxSizing: (styles.boxSizing as any) || "border-box",
        overflow: (styles.overflow as any),
        children: parseChildren(content, config),
      };
      nodes.push(boxNode);
    }
  }

  // Match images
  const imgRegex = /<img[^>]*src="([^"]*)"[^>]*>/gi;
  while ((match = imgRegex.exec(html)) !== null) {
    const imgStyles = parseInlineStyles(match[0].match(/style="([^"]*)"/)?.[1] || "");
    const src = match[1];

    // Check if it's inside an SVG (speaker photo)
    if (src.includes("speaker-photo")) {
      // This will be handled by SVG parsing
      continue;
    }

    const imageNode: ImageNode = {
      id: `image-${nodes.length}`,
      type: "image",
      width: imgStyles.width || 920,
      height: imgStyles.height || 50,
      src: src,
      fit: "contain",
      display: imgStyles.display as any || "block",
    };

    // Check for binding
    if (src.includes("mtl-code-wide") || src.includes("code-@-québec")) {
      imageNode.binding = { field: "logo", type: "image" };
    }

    nodes.push(imageNode);
  }

  // Match SVG elements
  const svgMatch = html.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i);
  if (svgMatch) {
    const svgStructure = extractSvgStructure(html);
    if (svgStructure) {
      const svgNode: SvgNode = {
        id: `svg-${nodes.length}`,
        type: "svg",
        width: 613.33,
        height: 489,
        viewBox: svgStructure.viewBox,
        preserveAspectRatio: svgStructure.preserveAspectRatio,
        imageHref: svgStructure.imageHref || undefined,
        imagePreserveAspectRatio: "xMidYMid slice",
      };

      if (svgStructure.maskPath) {
        svgNode.mask = {
          id: "speakerMask",
          path: svgStructure.maskPath,
        };
      }

      if (svgStructure.imageHref?.includes("speaker-photo")) {
        svgNode.binding = { field: "people[0].headshot", type: "image" };
      }

      nodes.push(svgNode);
    }
  }

  // Match text (spans and divs with text)
  const textRegex = /<(span|div)[^>]*style="([^"]*)"[^>]*>([^<]+(?:<[^>]+>[^<]*<\/[^>]+>)*[^<]*)<\/(span|div)>/gi;
  while ((match = textRegex.exec(html)) !== null) {
    const textStyles = parseInlineStyles(match[2]);
    const textContent = match[3].replace(/<[^>]*>/g, "").trim();

    if (!textContent) continue;

    const textNode: TextNode = {
      id: `text-${nodes.length}`,
      type: "text",
      width: textStyles.width || 920,
      height: textStyles.height || 50,
      content: textContent,
      fontFamily: textStyles.fontFamily || "'Aspekta', sans-serif",
      fontSize: textStyles.fontSize || 16,
      fontWeight: textStyles.fontWeight || "normal",
      lineHeight: textStyles.lineHeight || 1.2,
      textAlign: textStyles.textAlign || "left",
      color: textStyles.color || "#000000",
      marginBottom: textStyles.marginBottom,
      marginTop: textStyles.marginTop,
    };

    // Check for binding
    const binding = findTextBinding(textContent, config);
    if (binding) {
      textNode.binding = binding;
    }

    nodes.push(textNode);
  }

  return nodes;
}

// ============================================================================
// Find text binding from config
// ============================================================================

function findTextBinding(content: string, config: TemplateConfig): { field: string; type: "text" } | null {
  for (const field of config.fields) {
    if (field.replacements) {
      for (const replacement of field.replacements) {
        if (content.includes(replacement.pattern)) {
          return { field: field.name, type: "text" };
        }
      }
    }

    // Check people fields
    if (field.type === "people" && field.fields) {
      for (const personField of field.fields) {
        if (personField.replacements) {
          for (const replacement of personField.replacements) {
            if (content.includes(replacement.pattern)) {
              return { field: `people[0].${personField.name}`, type: "text" };
            }
          }
        }
      }
    }
  }

  return null;
}

// ============================================================================
// Create bindings from node tree
// ============================================================================

function createBindings(root: FrameNode, config: TemplateConfig): Array<{ nodeId: string; field: string; type: "text" | "image" | "color" }> {
  const bindings: Array<{ nodeId: string; field: string; type: "text" | "image" | "color" }> = [];

  function traverse(node: TemplateNode) {
    if ("binding" in node && node.binding) {
      bindings.push({
        nodeId: node.id,
        field: node.binding.field,
        type: node.binding.type,
      });
    }

    if ("children" in node && node.children) {
      for (const child of node.children) {
        traverse(child);
      }
    }
  }

  traverse(root);
  return bindings;
}

