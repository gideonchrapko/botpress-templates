/**
 * HTML to Layout Node Converter V3
 * Uses parse5 for proper DOM parsing (handles nested structures correctly)
 */

import { parse, DefaultTreeAdapterMap } from "parse5";
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

type Node = DefaultTreeAdapterMap["node"];
type Element = DefaultTreeAdapterMap["element"];
type TextNode_ = DefaultTreeAdapterMap["textNode"];

// ============================================================================
// Parse inline styles
// ============================================================================

interface ParsedStyles {
  width?: number | string; // Can be number (px) or string (calc/percent)
  height?: number | string;
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
        if (value.includes("calc") || value.includes("%")) {
          styles.width = value; // Keep as string for calc/percent
        } else {
          styles.width = parseFloat(value);
        }
        break;
      case "height":
        if (value.includes("calc") || value.includes("%")) {
          styles.height = value; // Keep as string for calc/percent
        } else {
          styles.height = parseFloat(value);
        }
        break;
      case "padding":
        // Support padding shorthand: 1-4 values
        const paddingValues = value.split(/\s+/).map(v => parseFloat(v));
        if (paddingValues.length === 1) {
          styles.padding = paddingValues[0];
        } else if (paddingValues.length === 2) {
          styles.padding = { top: paddingValues[0], right: paddingValues[1], bottom: paddingValues[0], left: paddingValues[1] };
        } else if (paddingValues.length === 4) {
          styles.padding = { top: paddingValues[0], right: paddingValues[1], bottom: paddingValues[2], left: paddingValues[3] };
        } else {
          styles.padding = paddingValues[0] || 0;
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
// Get attribute value from element
// ============================================================================

function getAttribute(element: Element, name: string): string | undefined {
  return element.attrs?.find(attr => attr.name === name)?.value;
}

// ============================================================================
// Get inline styles from element
// ============================================================================

function getStyles(element: Element): ParsedStyles {
  const styleAttr = getAttribute(element, "style");
  return styleAttr ? parseInlineStyles(styleAttr) : {};
}

// ============================================================================
// Get element text content (concatenated)
// ============================================================================

function getElementTextContent(element: Element): string {
  let text = "";
  
  function traverse(node: Node) {
    if (node.nodeName === "#text") {
      const textNode = node as TextNode_;
      text += textNode.value || "";
    } else if ("childNodes" in node && node.childNodes) {
      for (const child of node.childNodes) {
        traverse(child);
      }
    }
  }
  
  traverse(element);
  return text.trim();
}

// ============================================================================
// Extract text content from text nodes only (not innerText)
// ============================================================================

// Global counter for unique node IDs (shared across all extraction calls)
let globalNodeIdCounter = 0;

function extractTextNodes(node: Node, parentStyles: ParsedStyles = {}): TextNode[] {
  const textNodes: TextNode[] = [];

  function traverse(n: Node, inheritedStyles: ParsedStyles) {
    if (n.nodeName === "#text") {
      const textNode = n as TextNode_;
      const text = textNode.value?.trim();
      if (text) {
        textNodes.push({
          id: `text-${globalNodeIdCounter++}`,
          type: "text",
          width: typeof inheritedStyles.width === "number" ? inheritedStyles.width : 920,
          height: typeof inheritedStyles.height === "number" ? inheritedStyles.height : 50,
          content: text,
          fontFamily: inheritedStyles.fontFamily || "'Aspekta', sans-serif",
          fontSize: inheritedStyles.fontSize || 16,
          fontWeight: inheritedStyles.fontWeight || "normal",
          lineHeight: inheritedStyles.lineHeight || 1.2,
          textAlign: inheritedStyles.textAlign || "left",
          color: inheritedStyles.color || "#000000",
          marginBottom: inheritedStyles.marginBottom,
          marginTop: inheritedStyles.marginTop,
        });
      }
    } else if (n.nodeName === "span" || n.nodeName === "div") {
      const elem = n as Element;
      const styles = { ...inheritedStyles, ...getStyles(elem) };
      // Traverse children
      if (elem.childNodes) {
        for (const child of elem.childNodes) {
          traverse(child, styles);
        }
      }
    } else if (n.nodeName === "#document" || n.nodeName === "#document-fragment") {
      // Traverse children
      if ("childNodes" in n && n.childNodes) {
        for (const child of n.childNodes) {
          traverse(child, inheritedStyles);
        }
      }
    }
  }

  traverse(node, parentStyles);
  return textNodes;
}

// ============================================================================
// Convert HTML to Layout Nodes
// ============================================================================

export async function convertHTMLToLayoutNodes(
  templateFamily: string,
  variantNumber: string,
  config: TemplateConfig
): Promise<TemplateSchema | null> {
  // Reset global counter for each conversion
  globalNodeIdCounter = 0;
  
  const templatePath = join(process.cwd(), "templates", templateFamily, `template-${variantNumber}.html`);

  if (!existsSync(templatePath)) {
    return null;
  }

  const html = await readFile(templatePath, "utf-8");
  const document = parse(html);

  // Find body element
  const body = findElement(document, "body");
  if (!body) return null;

  // Find root container div (first div with width/height)
  const rootDiv = findRootContainer(body);
  if (!rootDiv) return null;

  const rootStyles = getStyles(rootDiv);

  // Create FrameNode (root)
  const frame: FrameNode = {
    id: "root",
    type: "frame",
    width: typeof rootStyles.width === "number" ? rootStyles.width : (rootStyles.width ? parseFloat(rootStyles.width.toString()) || config.width : config.width),
    height: typeof rootStyles.height === "number" ? rootStyles.height : (rootStyles.height ? parseFloat(rootStyles.height.toString()) || config.height : config.height),
    padding: rootStyles.padding || 80,
    backgroundColor: rootStyles.backgroundColor || "#F4F4F4",
    overflow: (rootStyles.overflow as any) || "hidden",
    boxSizing: (rootStyles.boxSizing as any) || "border-box",
    children: [],
  };

  // Parse children recursively
  frame.children = convertElementChildren(rootDiv, config, rootStyles);

  // Create bindings from node tree
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
// Find element by tag name (recursive)
// ============================================================================

function findElement(node: Node, tagName: string): Element | null {
  if (node.nodeName === tagName) {
    return node as Element;
  }

  if ("childNodes" in node && node.childNodes) {
    for (const child of node.childNodes) {
      const found = findElement(child, tagName);
      if (found) return found;
    }
  }

  return null;
}

// ============================================================================
// Find root container div
// ============================================================================

function findRootContainer(body: Element): Element | null {
  if (!body.childNodes) return null;

  for (const child of body.childNodes) {
    if (child.nodeName === "div") {
      const div = child as Element;
      const styles = getStyles(div);
      // Root container has explicit width/height (1080x1350)
      if (styles.width === 1080 && styles.height === 1350) {
        return div;
      }
    }
  }

  return null;
}

// ============================================================================
// Convert element children to nodes
// ============================================================================

function convertElementChildren(
  element: Element,
  config: TemplateConfig,
  inheritedStyles: ParsedStyles = {}
): TemplateNode[] {
  const nodes: TemplateNode[] = [];

  if (!element.childNodes) return nodes;

  for (const child of element.childNodes) {
    // Skip text nodes (handled separately)
    if (child.nodeName === "#text") continue;
    if (child.nodeName === "#comment") continue;

    if (child.nodeName === "div") {
      const div = child as Element;
      const divStyles = getStyles(div);
      // Don't inherit padding, backgroundColor, or boxSizing - only use element's own styles
      const styles = {
        ...inheritedStyles,
        ...divStyles,
        // Override inherited values with element's own (or undefined if not set)
        padding: divStyles.padding,
        backgroundColor: divStyles.backgroundColor,
        boxSizing: divStyles.boxSizing,
        overflow: divStyles.overflow,
      };

      // Check if div only contains text (no block children like div, img, svg)
      const hasBlockChildren = div.childNodes?.some(
        child => {
          const nodeName = child.nodeName.toLowerCase();
          return nodeName === "div" || nodeName === "img" || nodeName === "svg" || nodeName === "p";
        }
      );
      
      // If div only has text/spans and no display:flex, treat it as a text container
      // Extract text nodes directly without creating a wrapper container
      if (!hasBlockChildren && styles.display !== "flex") {
        const textContent = getElementTextContent(div);
        if (textContent.trim()) {
          const textNodes = extractTextNodes(div, styles);
          for (const textNode of textNodes) {
            const binding = findTextBinding(textNode.content, config, textContent);
            if (binding) {
              textNode.binding = binding;
            }
            nodes.push(textNode);
          }
          continue; // Skip creating a container node
        }
      }

      if (styles.display === "flex") {
        // Flex node - extract text nodes from direct children first
        const flexChildren: TemplateNode[] = [];
        
        // Check if div has direct text children (not wrapped in spans)
        const hasDirectText = div.childNodes?.some(
          child => child.nodeName === "#text" && (child as TextNode_).value?.trim()
        );
        
        if (hasDirectText) {
          // Extract text nodes with parent context for binding
          const parentTextContent = getElementTextContent(div);
          const textNodes = extractTextNodes(div, styles);
          for (const textNode of textNodes) {
            const binding = findTextBinding(textNode.content, config, parentTextContent);
            if (binding) {
              textNode.binding = binding;
            }
            flexChildren.push(textNode);
          }
        }
        
        // Add other children (non-text elements)
        const otherChildren = convertElementChildren(div, config, styles);
        flexChildren.push(...otherChildren);
        
        const flexNode: FlexNode = {
          id: `flex-${globalNodeIdCounter++}`,
          type: "flex",
          width: typeof styles.width === "number" ? styles.width : (styles.width ? parseFloat(styles.width.toString()) || 920 : 920),
          height: typeof styles.height === "number" ? styles.height : (styles.height ? parseFloat(styles.height.toString()) || 100 : 100),
          flexDirection: styles.flexDirection || "row",
          justifyContent: (styles.justifyContent as any) || "flex-start",
          alignItems: (styles.alignItems as any) || "stretch",
          padding: styles.padding,
          backgroundColor: styles.backgroundColor,
          boxSizing: (styles.boxSizing as any) || "border-box",
          children: flexChildren,
        };
        nodes.push(flexNode);
      } else {
        // Box node - but check if it only contains text first
        const hasBlockChildren = div.childNodes?.some(
          child => {
            const nodeName = child.nodeName.toLowerCase();
            return nodeName === "div" || nodeName === "img" || nodeName === "svg" || nodeName === "p";
          }
        );
        
        // If div only has text/spans, extract text nodes directly without creating a box container
        if (!hasBlockChildren) {
          const textContent = getElementTextContent(div);
          if (textContent.trim()) {
            const textNodes = extractTextNodes(div, styles);
            for (const textNode of textNodes) {
              const binding = findTextBinding(textNode.content, config, textContent);
              if (binding) {
                textNode.binding = binding;
              }
              nodes.push(textNode);
            }
            continue; // Skip creating a box container
          }
        }
        
        // Box node - extract text nodes from direct children first
        const boxChildren: TemplateNode[] = [];
        
        // Check if div has direct text children (not wrapped in spans)
        const hasDirectText = div.childNodes?.some(
          child => child.nodeName === "#text" && (child as TextNode_).value?.trim()
        );
        
        if (hasDirectText) {
          // Extract text nodes with parent context for binding
          const parentTextContent = getElementTextContent(div);
          const textNodes = extractTextNodes(div, styles);
          for (const textNode of textNodes) {
            const binding = findTextBinding(textNode.content, config, parentTextContent);
            if (binding) {
              textNode.binding = binding;
            }
            boxChildren.push(textNode);
          }
        }
        
        // Add other children (non-text elements)
        const otherChildren = convertElementChildren(div, config, styles);
        boxChildren.push(...otherChildren);
        
        const boxNode: BoxNode = {
          id: `box-${globalNodeIdCounter++}`,
          type: "box",
          width: typeof styles.width === "number" ? styles.width : (styles.width ? parseFloat(styles.width.toString()) || 920 : 920),
          height: typeof styles.height === "number" ? styles.height : (styles.height ? parseFloat(styles.height.toString()) || 100 : 100),
          padding: styles.padding,
          backgroundColor: styles.backgroundColor,
          boxSizing: (styles.boxSizing as any) || "border-box",
          overflow: (styles.overflow as any),
          children: boxChildren,
        };
        nodes.push(boxNode);
      }
    } else if (child.nodeName === "img") {
      const img = child as Element;
      const src = getAttribute(img, "src");
      if (!src) continue;

      const imgStyles = { ...inheritedStyles, ...getStyles(img) };

      // Parse width/height - handle auto/null
      let imgWidth: number = 920; // Default
      let imgHeight: number | null = null; // null means auto
      
      if (imgStyles.width) {
        if (typeof imgStyles.width === "number") {
          imgWidth = imgStyles.width;
        } else if (imgStyles.width !== "auto" && imgStyles.width !== "null") {
          const parsed = parseFloat(imgStyles.width.toString());
          if (!isNaN(parsed)) imgWidth = parsed;
        }
      }
      
      if (imgStyles.height) {
        if (typeof imgStyles.height === "number") {
          imgHeight = imgStyles.height;
        } else if (imgStyles.height !== "auto" && imgStyles.height !== "null") {
          const parsed = parseFloat(imgStyles.height.toString());
          if (!isNaN(parsed)) imgHeight = parsed;
        }
      } else {
        // If height is auto/null, set to null (will be handled in compiler)
        imgHeight = null;
      }

      const imageNode: ImageNode = {
        id: `image-${globalNodeIdCounter++}`,
        type: "image",
        width: imgWidth,
        height: imgHeight, // Can be null for auto
        src: src,
        fit: "contain",
        display: (imgStyles.display as any) || "block",
      };

      // Check for binding
      if (src.includes("mtl-code-wide") || src.includes("code-@-québec")) {
        imageNode.binding = { field: "logo", type: "image" };
      } else if (src.includes("decoration")) {
        // Decoration image, no binding
      }

      nodes.push(imageNode);
    } else if (child.nodeName === "svg") {
      const svg = child as Element;
      const viewBox = getAttribute(svg, "viewBox");
      const preserveAspectRatio = getAttribute(svg, "preserveAspectRatio");

      // Find mask and image inside SVG
      const mask = findElement(svg, "mask");
      const image = findElement(svg, "image");

      const maskPath = mask ? findElement(mask, "path") : null;
      const maskPathD = maskPath ? getAttribute(maskPath, "d") : null;
      const maskId = mask ? getAttribute(mask, "id") : null;

      const imageHref = image ? getAttribute(image, "href") : null;
      const imagePreserveAspectRatio = image ? getAttribute(image, "preserveAspectRatio") : null;

      const svgStyles = getStyles(svg);

      const svgNode: SvgNode = {
        id: `svg-${globalNodeIdCounter++}`,
        type: "svg",
        width: typeof svgStyles.width === "number" ? svgStyles.width : (svgStyles.width ? parseFloat(svgStyles.width.toString()) || 613.33 : 613.33),
        height: typeof svgStyles.height === "number" ? svgStyles.height : (svgStyles.height ? parseFloat(svgStyles.height.toString()) || 489 : 489),
        viewBox: viewBox || "0 0 493 476",
        preserveAspectRatio: preserveAspectRatio || "xMidYMid meet",
        imageHref: imageHref || undefined,
        imagePreserveAspectRatio: imagePreserveAspectRatio || "xMidYMid slice",
      };

      if (maskPathD && maskId) {
        svgNode.mask = {
          id: maskId,
          path: maskPathD,
        };
      }

      if (imageHref && imageHref.includes("speaker-photo")) {
        svgNode.binding = { field: "people[0].headshot", type: "image" };
      }

      nodes.push(svgNode);
    } else if (child.nodeName === "span" || child.nodeName === "p") {
      // Extract text nodes from span/p
      const span = child as Element;
      const spanStyles = { ...inheritedStyles, ...getStyles(span) };
      const parentTextContent = getElementTextContent(span);
      const textNodes = extractTextNodes(span, spanStyles);
      
      // Check for bindings and add them
      for (const textNode of textNodes) {
        const binding = findTextBinding(textNode.content, config, parentTextContent);
        if (binding) {
          textNode.binding = binding;
        }
        nodes.push(textNode);
      }
    }
  }

  return nodes;
}

// ============================================================================
// Find text binding from config
// ============================================================================

function findTextBinding(content: string, config: TemplateConfig, parentTextContent?: string): { field: string; type: "text" } | null {
  // Check config replacement patterns first (most reliable)
  for (const field of config.fields) {
    if (field.replacements) {
      for (const replacement of field.replacements) {
        // Check both the content and parent text content
        const textToCheck = parentTextContent || content;
        if (textToCheck.includes(replacement.pattern)) {
          return { field: field.name, type: "text" };
        }
      }
    }

    // Check people fields
    if (field.type === "people" && field.fields) {
      for (const personField of field.fields) {
        if (personField.replacements) {
          for (const replacement of personField.replacements) {
            const textToCheck = parentTextContent || content;
            if (textToCheck.includes(replacement.pattern)) {
              return { field: `people[0].${personField.name}`, type: "text" };
            }
          }
        }
      }
    }
  }
  
  // Fallback heuristics
  // Check for placeholder patterns
  if (content.includes("Placeholder Text")) {
    return { field: "eventTitle", type: "text" };
  }
  
  // Check date patterns (e.g., "Thursday, November 20")
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
  
  // Check city/zip patterns (e.g., "Montreal, QC  H3A 1L4")
  if (content.match(/[A-Z][a-z]+,\s*[A-Z]{2}\s+[A-Z0-9\s]+/)) {
    return { field: "cityLine", type: "text" };
  }
  
  // Check speaker role patterns (contains @)
  if (content.includes("@")) {
    return { field: "people[0].role", type: "text" };
  }
  
  // Check speaker name (first word, capitalized, no special chars)
  if (content.match(/^[A-Z][a-z]+\s+[A-Z][a-z]+$/)) {
    return { field: "people[0].name", type: "text" };
  }
  
  // Long text without colons is likely a talk title
  if (content.length > 20 && !content.includes(":")) {
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

