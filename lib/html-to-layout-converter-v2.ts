/**
 * HTML to Layout Node Converter V2
 * Properly maps HTML flexbox structure to layout nodes
 * Preserves exact structure for pixel-perfect rendering
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
// Parse inline styles
// ============================================================================

interface ParsedStyles {
  width?: number;
  height?: number;
  padding?: number | { top?: number; right?: number; bottom?: number; left?: number };
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
  margin?: string;
  paddingRight?: number;
  paddingLeft?: number;
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
          // Handle calc(100% - 20px) -> approximate
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
      case "padding-right":
        styles.paddingRight = parseFloat(value);
        break;
      case "padding-left":
        styles.paddingLeft = parseFloat(value);
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
      case "margin":
        styles.margin = value;
        break;
    }
  }

  return styles;
}

// ============================================================================
// Convert HTML to Layout Nodes
// ============================================================================

export async function convertHTMLToLayoutNodes(
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

  // Find root container div (first div with width/height)
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
  frame.children = parseHTMLStructure(rootContent, config);

  // Create bindings from config
  const bindings = createBindingsFromTree(frame, config);

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
// Parse HTML structure recursively
// ============================================================================

function parseHTMLStructure(html: string, config: TemplateConfig): TemplateNode[] {
  const nodes: TemplateNode[] = [];
  
  // Remove comments
  html = html.replace(/<!--[\s\S]*?-->/g, "");

  // Process in order: find all top-level elements
  let remaining = html;
  let nodeIdCounter = 0;

  while (remaining.trim()) {
    // Try to match a div
    const divMatch = remaining.match(/^<div[^>]*style="([^"]*)"[^>]*>([\s\S]*?)<\/div>/);
    if (divMatch) {
      const [fullMatch, styleAttr, content] = divMatch;
      const styles = parseInlineStyles(styleAttr);
      
      // Check if it's a flex container
      if (styles.display === "flex") {
        const flexNode: FlexNode = {
          id: `flex-${nodeIdCounter++}`,
          type: "flex",
          width: styles.width || 920,
          height: styles.height || 100,
          flexDirection: styles.flexDirection || "row",
          justifyContent: (styles.justifyContent as any) || "flex-start",
          alignItems: (styles.alignItems as any) || "stretch",
          padding: styles.padding,
          backgroundColor: styles.backgroundColor,
          boxSizing: (styles.boxSizing as any) || "border-box",
          children: parseHTMLStructure(content, config),
        };
        nodes.push(flexNode);
      } else {
        // Regular box container
        const boxNode: BoxNode = {
          id: `box-${nodeIdCounter++}`,
          type: "box",
          width: styles.width || 920,
          height: styles.height || 100,
          padding: styles.padding,
          backgroundColor: styles.backgroundColor,
          boxSizing: (styles.boxSizing as any) || "border-box",
          overflow: (styles.overflow as any),
          children: parseHTMLStructure(content, config),
        };
        nodes.push(boxNode);
      }
      
      remaining = remaining.substring(fullMatch.length);
      continue;
    }

    // Try to match an img
    const imgMatch = remaining.match(/^<img[^>]*src="([^"]*)"[^>]*>/);
    if (imgMatch) {
      const [fullMatch, src] = imgMatch;
      const imgTag = fullMatch;
      const imgStyles = parseInlineStyles(imgTag.match(/style="([^"]*)"/)?.[1] || "");
      
      const imageNode: ImageNode = {
        id: `image-${nodeIdCounter++}`,
        type: "image",
        width: imgStyles.width || 920,
        height: imgStyles.height || 50,
        src: src,
        fit: "contain",
        display: (imgStyles.display as any) || "block",
      };

      // Check for binding
      if (src.includes("mtl-code-wide") || src.includes("code-@-québec")) {
        imageNode.binding = { field: "logo", type: "image" };
      }

      nodes.push(imageNode);
      remaining = remaining.substring(fullMatch.length);
      continue;
    }

    // Try to match an SVG
    const svgMatch = remaining.match(/^<svg[^>]*>([\s\S]*?)<\/svg>/);
    if (svgMatch) {
      const [fullMatch, svgContent] = svgMatch;
      const svgTag = fullMatch.substring(0, fullMatch.indexOf(">") + 1);
      const viewBoxMatch = svgTag.match(/viewBox="([^"]*)"/);
      const preserveAspectRatioMatch = svgTag.match(/preserveAspectRatio="([^"]*)"/);
      
      const maskMatch = svgContent.match(/<mask[^>]*id="([^"]*)"[^>]*>[\s\S]*?<path[^>]*d="([^"]*)"[^>]*fill="white"[^>]*>/);
      const imageMatch = svgContent.match(/<image[^>]*href="([^"]*)"[^>]*preserveAspectRatio="([^"]*)"/);

      const svgNode: SvgNode = {
        id: `svg-${nodeIdCounter++}`,
        type: "svg",
        width: 613.33,
        height: 489,
        viewBox: viewBoxMatch ? viewBoxMatch[1] : "0 0 493 476",
        preserveAspectRatio: preserveAspectRatioMatch ? preserveAspectRatioMatch[1] : "xMidYMid meet",
        imageHref: imageMatch ? imageMatch[1] : undefined,
        imagePreserveAspectRatio: imageMatch ? imageMatch[2] : "xMidYMid slice",
      };

      if (maskMatch) {
        svgNode.mask = {
          id: maskMatch[1],
          path: maskMatch[2],
        };
      }

      if (imageMatch && imageMatch[1].includes("speaker-photo")) {
        svgNode.binding = { field: "people[0].headshot", type: "image" };
      }

      nodes.push(svgNode);
      remaining = remaining.substring(fullMatch.length);
      continue;
    }

    // Try to match a span or div with text
    const textMatch = remaining.match(/^<(span|div)[^>]*style="([^"]*)"[^>]*>([^<]+(?:<[^>]+>[^<]*<\/[^>]+>)*[^<]*)<\/(span|div)>/);
    if (textMatch) {
      const [fullMatch, , styleAttr, textContent] = textMatch;
      const textStyles = parseInlineStyles(styleAttr);
      const cleanText = textContent.replace(/<[^>]*>/g, "").trim();

      if (cleanText) {
        const textNode: TextNode = {
          id: `text-${nodeIdCounter++}`,
          type: "text",
          width: textStyles.width || 920,
          height: textStyles.height || 50,
          content: cleanText,
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
        const binding = findTextBinding(cleanText, config);
        if (binding) {
          textNode.binding = binding;
        }

        nodes.push(textNode);
      }
      
      remaining = remaining.substring(fullMatch.length);
      continue;
    }

    // Skip one character if no match (prevent infinite loop)
    remaining = remaining.substring(1);
  }

  return nodes;
}

// ============================================================================
// Find text binding from config
// ============================================================================

function findTextBinding(content: string, config: TemplateConfig): { field: string; type: "text" } | null {
  // Check for placeholder patterns
  if (content.includes("Placeholder Text")) {
    return { field: "eventTitle", type: "text" };
  }
  
  // Check date patterns
  if (content.match(/\w+day,\s*\w+\s+\d+/)) {
    return { field: "eventDate", type: "text" };
  }
  
  // Check time patterns
  if (content.includes("Doors open") || content.includes("Ouverture")) {
    return { field: "doorTime", type: "text" };
  }
  
  // Check address patterns
  if (content.includes("Blvd") || content.includes("Bd")) {
    return { field: "addressLine", type: "text" };
  }
  
  if (content.match(/[A-Z][a-z]+,\s*[A-Z]{2}\s+[A-Z0-9\s]+/)) {
    return { field: "cityLine", type: "text" };
  }
  
  // Check speaker patterns
  if (content.includes("@")) {
    return { field: "people[0].role", type: "text" };
  }
  
  if (content.length > 20 && !content.includes(":")) {
    // Likely a talk title
    return { field: "people[0].talkTitle", type: "text" };
  }
  
  return null;
}

// ============================================================================
// Create bindings from node tree
// ============================================================================

function createBindingsFromTree(root: FrameNode, config: TemplateConfig): Array<{ nodeId: string; field: string; type: "text" | "image" | "color" }> {
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

