/**
 * HTML to Node Graph Converter V2
 * Phase 2: More accurate converter that manually maps known HTML structure
 * 
 * This version creates nodes based on the actual HTML layout structure
 * rather than trying to parse it generically.
 */

import { readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { TemplateNode, TemplateSchema, TextNode, ImageNode, ShapeNode } from "./node-types";
import { TemplateConfig } from "./template-registry";

// ============================================================================
// Extract text content from HTML element
// ============================================================================

function extractTextContent(html: string, pattern: string): string | null {
  // Find the element containing the pattern
  const regex = new RegExp(`<[^>]*>([^<]*${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^<]*)</[^>]*>`, "i");
  const match = html.match(regex);
  if (match) {
    // Extract just the text, removing HTML tags
    return match[1].replace(/<[^>]*>/g, "").trim();
  }
  return null;
}

// ============================================================================
// Extract image src from HTML
// ============================================================================

function extractImageSrc(html: string, pattern: string): string | null {
  // Look for img tag with src containing pattern
  const regex = new RegExp(`<img[^>]*src="([^"]*${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^"]*)"[^>]*>`, "i");
  const match = html.match(regex);
  return match ? match[1] : null;
}

// ============================================================================
// Extract SVG image href
// ============================================================================

function extractSVGImageHref(html: string, pattern: string): string | null {
  // Look for SVG image element with href containing pattern
  const regex = new RegExp(`<image[^>]*href="([^"]*${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^"]*)"[^>]*>`, "i");
  const match = html.match(regex);
  return match ? match[1] : null;
}

// ============================================================================
// Find field binding for content
// ============================================================================

function findFieldBinding(
  content: string | null,
  src: string | null,
  config: TemplateConfig
): { field: string; type: "text" | "image" | "color" } | null {
  if (!content && !src) return null;
  
  // Check text fields
  for (const field of config.fields) {
    if (field.replacements) {
      for (const replacement of field.replacements) {
        if (content && content.includes(replacement.pattern)) {
          return { field: field.name, type: field.type as any };
        }
      }
    }
  }
  
  // Check people fields
  for (const field of config.fields) {
    if (field.type === "people" && field.fields) {
      for (const personField of field.fields) {
        if (personField.replacements) {
          for (const replacement of personField.replacements) {
            if (content && content.includes(replacement.pattern)) {
              return { field: `people[0].${personField.name}`, type: personField.type as any };
            }
            if (src && src.includes(replacement.pattern)) {
              return { field: `people[0].${personField.name}`, type: personField.type as any };
            }
          }
        }
      }
    }
  }
  
  // Check image assets
  if (src) {
    // Check logo
    if (src.includes("mtl-code-wide") || src.includes("code-@-québec")) {
      return { field: "logo", type: "image" };
    }
    // Check decoration
    if (src.includes("decoration")) {
      return null; // Decoration is not bound to a field
    }
    // Check speaker photo
    if (src.includes("speaker-photo")) {
      return { field: "people[0].headshot", type: "image" };
    }
  }
  
  return null;
}

// ============================================================================
// Convert MTL Code Template to Node Graph
// ============================================================================

export async function convertMTLCodeTemplate(
  variantNumber: string,
  config: TemplateConfig
): Promise<TemplateSchema | null> {
  const templatePath = join(
    process.cwd(),
    "templates",
    "mtl-code",
    `template-${variantNumber}.html`
  );
  
  if (!existsSync(templatePath)) {
    return null;
  }
  
  const html = await readFile(templatePath, "utf-8");
  const nodes: TemplateNode[] = [];
  let zIndex = 0;
  
  // Base container padding
  const basePadding = 80;
  
  // ============================================================================
  // Background
  // ============================================================================
  const background: ShapeNode = {
    id: "background",
    type: "shape",
    x: 0,
    y: 0,
    width: 1080,
    height: 1350,
    zIndex: zIndex++,
    shapeType: "rectangle",
    fill: "#F4F4F4",
  };
  nodes.push(background);
  
  // ============================================================================
  // Top Section: Logo and Title
  // ============================================================================
  
  // Logo - centered in top section (397px height, centered vertically)
  const logoSrc = extractImageSrc(html, "mtl-code-wide") || extractImageSrc(html, "code-@-québec");
  if (logoSrc) {
    const logo: ImageNode = {
      id: "logo",
      type: "image",
      x: basePadding,
      y: basePadding + (397 - 50) / 2, // Center in 397px section, assuming ~50px logo height
      width: 920,
      height: 50,
      zIndex: zIndex++,
      src: logoSrc,
      fit: "contain",
      binding: { field: "logo", type: "image" },
    };
    nodes.push(logo);
  }
  
  // Event Title - at bottom of top section
  const titleContent = extractTextContent(html, "Placeholder Text");
  if (titleContent) {
    const title: TextNode = {
      id: "event-title",
      type: "text",
      x: basePadding,
      y: basePadding + 397 - 50, // At bottom of 397px section
      width: 920,
      height: 50,
      zIndex: zIndex++,
      content: titleContent,
      fontFamily: "'Aspekta', sans-serif",
      fontSize: 50,
      fontWeight: 500,
      lineHeight: 1.1,
      textAlign: "center",
      color: "#000000",
      binding: { field: "eventTitle", type: "text" },
    };
    nodes.push(title);
  }
  
  // ============================================================================
  // Date/Time Section (Left Column)
  // ============================================================================
  
  // Date background
  const dateBg: ShapeNode = {
    id: "date-bg",
    type: "shape",
    x: basePadding,
    y: basePadding + 397,
    width: 306.67,
    height: 264,
    zIndex: zIndex++,
    shapeType: "rectangle",
    fill: "token:primary",
  };
  nodes.push(dateBg);
  
  // Date text - padding 40px, margin-bottom 10px
  const dateContent = extractTextContent(html, "Thursday, November 20") || extractTextContent(html, "novembre");
  if (dateContent) {
    const date: TextNode = {
      id: "date",
      type: "text",
      x: basePadding + 40,
      y: basePadding + 397 + 40, // Date section starts at 477, + 40px padding
      width: 226.67,
      height: 40,
      zIndex: zIndex++,
      content: dateContent,
      fontFamily: "'Aspekta', sans-serif",
      fontSize: 34,
      fontWeight: 500,
      lineHeight: 1.1,
      textAlign: "left",
      color: "#F4F4F4",
      binding: { field: "eventDate", type: "text" },
    };
    nodes.push(date);
  }
  
  // Time text - padding 40px, 10px margin-bottom from date
  const timeContent = extractTextContent(html, "Doors open @") || extractTextContent(html, "Ouverture à");
  if (timeContent) {
    const time: TextNode = {
      id: "time",
      type: "text",
      x: basePadding + 40,
      y: basePadding + 397 + 40 + 40 + 10, // Date y + date height + margin-bottom
      width: 226.67,
      height: 30,
      zIndex: zIndex++,
      content: timeContent,
      fontFamily: "'Aspekta', sans-serif",
      fontSize: 25,
      fontWeight: 300,
      lineHeight: 1.1,
      textAlign: "left",
      color: "#F4F4F4",
      binding: { field: "doorTime", type: "text" },
    };
    nodes.push(time);
  }
  
  // ============================================================================
  // Address Section (Middle Column)
  // ============================================================================
  
  // Address text 1 - middle column, same y as date
  const address1Content = extractTextContent(html, "400 Blvd. De Maisonneuve Ouest") || extractTextContent(html, "875 Bd Charest");
  if (address1Content) {
    const address1: TextNode = {
      id: "address-line-1",
      type: "text",
      x: basePadding + 306.67, // Middle column
      y: basePadding + 397 + 40, // Same y as date
      width: 226.67,
      height: 40,
      zIndex: zIndex++,
      content: address1Content,
      fontFamily: "'Aspekta', sans-serif",
      fontSize: 34,
      fontWeight: 500,
      lineHeight: 1.1,
      textAlign: "left",
      color: "token:primary",
      binding: { field: "addressLine", type: "text" },
    };
    nodes.push(address1);
  }
  
  // Address text 2 - middle column, same y as time
  const address2Content = extractTextContent(html, "Montreal, QC") || extractTextContent(html, "Québec City");
  if (address2Content) {
    const address2: TextNode = {
      id: "address-line-2",
      type: "text",
      x: basePadding + 306.67, // Middle column
      y: basePadding + 397 + 40 + 40 + 10, // Same y as time
      width: 226.67,
      height: 30,
      zIndex: zIndex++,
      content: address2Content,
      fontFamily: "'Aspekta', sans-serif",
      fontSize: 25,
      fontWeight: 300,
      lineHeight: 1.1,
      textAlign: "left",
      color: "token:primary",
      binding: { field: "cityLine", type: "text" },
    };
    nodes.push(address2);
  }
  
  // ============================================================================
  // Decoration (Right Column)
  // ============================================================================
  
  const decorationSrc = extractImageSrc(html, "decoration");
  if (decorationSrc) {
    const decoration: ImageNode = {
      id: "decoration",
      type: "image",
      x: basePadding + 613.33,
      y: basePadding + 397 + 5,
      width: 306.66,
      height: 254,
      zIndex: zIndex++,
      src: decorationSrc,
      fit: "contain",
    };
    nodes.push(decoration);
  }
  
  // ============================================================================
  // Speaker Section (Bottom)
  // ============================================================================
  
  // Speaker section: y = 741 (80 + 397 + 264), has 10px padding
  // Speaker background
  const speakerBg: ShapeNode = {
    id: "speaker-bg",
    type: "shape",
    x: basePadding,
    y: basePadding + 397 + 264, // 741
    width: 920,
    height: 529,
    zIndex: zIndex++,
    shapeType: "rectangle",
    fill: "token:secondary",
  };
  nodes.push(speakerBg);
  
  // Speaker name - section padding (10px) + column padding (40px) = 791
  const speakerNameContent = extractTextContent(html, "Michael Masson");
  if (speakerNameContent) {
    const speakerName: TextNode = {
      id: "speaker-name",
      type: "text",
      x: basePadding + 40, // 120
      y: basePadding + 397 + 264 + 10 + 40, // 791 (741 + 10 + 40)
      width: 226.67,
      height: 40,
      zIndex: zIndex++,
      content: speakerNameContent,
      fontFamily: "'Aspekta', sans-serif",
      fontSize: 34,
      fontWeight: 500,
      lineHeight: 1.1,
      textAlign: "left",
      color: "#000000",
      binding: { field: "people[0].name", type: "text" },
    };
    nodes.push(speakerName);
  }
  
  // Speaker role - name y (791) + name height (40) + margin-bottom (10) = 841
  const speakerRoleContent = extractTextContent(html, "CTO @ Botpress");
  if (speakerRoleContent) {
    const speakerRole: TextNode = {
      id: "speaker-role",
      type: "text",
      x: basePadding + 40, // 120
      y: basePadding + 397 + 264 + 10 + 40 + 40 + 10, // 841
      width: 226.67,
      height: 30,
      zIndex: zIndex++,
      content: speakerRoleContent,
      fontFamily: "'Aspekta', sans-serif",
      fontSize: 25,
      fontWeight: 300,
      lineHeight: 1.1,
      textAlign: "left",
      color: "#000000",
      binding: { field: "people[0].role", type: "text" },
    };
    nodes.push(speakerRole);
  }
  
  // Talk title - role y (841) + role height (30) + margin-top (35) = 906
  const talkTitleContent = extractTextContent(html, "Kubernetes the right way");
  if (talkTitleContent) {
    const talkTitle: TextNode = {
      id: "talk-title",
      type: "text",
      x: basePadding + 40, // 120
      y: basePadding + 397 + 264 + 10 + 40 + 40 + 10 + 30 + 35, // 906
      width: 226.67,
      height: 200,
      zIndex: zIndex++,
      content: talkTitleContent,
      fontFamily: "'Aspekta', sans-serif",
      fontSize: 34,
      fontWeight: 500,
      lineHeight: 1.1,
      textAlign: "left",
      color: "#000000",
      binding: { field: "people[0].talkTitle", type: "text" },
    };
    nodes.push(talkTitle);
  }
  
  // Speaker photo - right side, section padding (10px), x = 396.67 (306.67 + 10)
  const speakerPhotoSrc = extractSVGImageHref(html, "speaker-photo");
  if (speakerPhotoSrc) {
    const speakerPhoto: ImageNode = {
      id: "speaker-photo",
      type: "image",
      x: basePadding + 306.67 + 10, // 396.67 (right column + section padding)
      y: basePadding + 397 + 264 + 10, // 751 (741 + 10)
      width: 593.33, // 613.33 - 20px (10px padding each side)
      height: 489, // 509 - 20px (10px top + 10px bottom)
      zIndex: zIndex++,
      src: speakerPhotoSrc,
      fit: "cover",
      binding: { field: "people[0].headshot", type: "image" },
    };
    nodes.push(speakerPhoto);
  }
  
  // ============================================================================
  // Create bindings
  // ============================================================================
  
  const bindings = nodes
    .filter(node => {
      if (node.type === "text") return (node as TextNode).binding;
      if (node.type === "image") return (node as ImageNode).binding;
      return false;
    })
    .map(node => {
      if (node.type === "text") {
        const textNode = node as TextNode;
        return {
          nodeId: textNode.id,
          field: textNode.binding!.field,
          type: "text" as const,
        };
      } else if (node.type === "image") {
        const imageNode = node as ImageNode;
        return {
          nodeId: imageNode.id,
          field: imageNode.binding!.field,
          type: "image" as const,
        };
      }
      return null;
    })
    .filter(Boolean) as Array<{ nodeId: string; field: string; type: "text" | "image" }>;
  
  // ============================================================================
  // Create tokens
  // ============================================================================
  
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
  
  // ============================================================================
  // Create schema
  // ============================================================================
  
  const schema: TemplateSchema = {
    id: `mtl-code-${variantNumber}`,
    name: "mtl-code",
    title: config.name,
    version: 1,
    dimensions: {
      width: config.width,
      height: config.height,
    },
    nodes,
    tokens,
    variants: [],
    bindings,
  };
  
  return schema;
}

// ============================================================================
// Convert Code @ Québec Template to Node Graph
// ============================================================================

export async function convertCodeAQuebecTemplate(
  variantNumber: string,
  config: TemplateConfig
): Promise<TemplateSchema | null> {
  const templatePath = join(
    process.cwd(),
    "templates",
    "code-a-quebec",
    `template-${variantNumber}.html`
  );
  
  if (!existsSync(templatePath)) {
    return null;
  }
  
  const html = await readFile(templatePath, "utf-8");
  const nodes: TemplateNode[] = [];
  let zIndex = 0;
  
  // Base container padding
  const basePadding = 80;
  
  // ============================================================================
  // Background
  // ============================================================================
  const background: ShapeNode = {
    id: "background",
    type: "shape",
    x: 0,
    y: 0,
    width: 1080,
    height: 1350,
    zIndex: zIndex++,
    shapeType: "rectangle",
    fill: "#F4F4F4",
  };
  nodes.push(background);
  
  // ============================================================================
  // Top Section: Logo and Title
  // ============================================================================
  
  // Logo (code-@-québec-long.svg)
  const logoSrc = extractImageSrc(html, "code-@-québec");
  if (logoSrc) {
    const logo: ImageNode = {
      id: "logo",
      type: "image",
      x: basePadding,
      y: basePadding + 173.5,
      width: 920,
      height: 50,
      zIndex: zIndex++,
      src: logoSrc,
      fit: "contain",
      binding: { field: "logo", type: "image" },
    };
    nodes.push(logo);
  }
  
  // Event Title
  const titleContent = extractTextContent(html, "Placeholder Text");
  if (titleContent) {
    const title: TextNode = {
      id: "event-title",
      type: "text",
      x: basePadding,
      y: basePadding + 347,
      width: 920,
      height: 50,
      zIndex: zIndex++,
      content: titleContent,
      fontFamily: "'Aspekta', sans-serif",
      fontSize: 50,
      fontWeight: 500,
      lineHeight: 1.1,
      textAlign: "center",
      color: "#000000",
      binding: { field: "eventTitle", type: "text" },
    };
    nodes.push(title);
  }
  
  // ============================================================================
  // Date/Time Section (Left Column) - French format
  // ============================================================================
  
  // Date background
  const dateBg: ShapeNode = {
    id: "date-bg",
    type: "shape",
    x: basePadding,
    y: basePadding + 397,
    width: 306.67,
    height: 264,
    zIndex: zIndex++,
    shapeType: "rectangle",
    fill: "token:primary",
  };
  nodes.push(dateBg);
  
  // Date text (French format: "lundi 20 novembre")
  const dateContent = extractTextContent(html, "novembre");
  if (dateContent) {
    const date: TextNode = {
      id: "date",
      type: "text",
      x: basePadding + 40,
      y: basePadding + 397 + 40,
      width: 226.67,
      height: 40,
      zIndex: zIndex++,
      content: dateContent,
      fontFamily: "'Aspekta', sans-serif",
      fontSize: 34,
      fontWeight: 500,
      lineHeight: 1.1,
      textAlign: "left",
      color: "#F4F4F4",
      binding: { field: "eventDate", type: "text" },
    };
    nodes.push(date);
  }
  
  // Time text (French format: "Ouverture à 18:00")
  const timeContent = extractTextContent(html, "Ouverture à");
  if (timeContent) {
    const time: TextNode = {
      id: "time",
      type: "text",
      x: basePadding + 40,
      y: basePadding + 397 + 90,
      width: 226.67,
      height: 30,
      zIndex: zIndex++,
      content: timeContent,
      fontFamily: "'Aspekta', sans-serif",
      fontSize: 25,
      fontWeight: 300,
      lineHeight: 1.1,
      textAlign: "left",
      color: "#F4F4F4",
      binding: { field: "doorTime", type: "text" },
    };
    nodes.push(time);
  }
  
  // ============================================================================
  // Address Section (Middle Column) - Quebec address
  // ============================================================================
  
  // Address text 1
  const address1Content = extractTextContent(html, "875 Bd Charest");
  if (address1Content) {
    const address1: TextNode = {
      id: "address-line-1",
      type: "text",
      x: basePadding + 306.67,
      y: basePadding + 397 + 40,
      width: 226.67,
      height: 40,
      zIndex: zIndex++,
      content: address1Content,
      fontFamily: "'Aspekta', sans-serif",
      fontSize: 34,
      fontWeight: 500,
      lineHeight: 1.1,
      textAlign: "left",
      color: "token:primary",
      binding: { field: "addressLine", type: "text" },
    };
    nodes.push(address1);
  }
  
  // Address text 2
  const address2Content = extractTextContent(html, "Québec City");
  if (address2Content) {
    const address2: TextNode = {
      id: "address-line-2",
      type: "text",
      x: basePadding + 306.67,
      y: basePadding + 397 + 90,
      width: 226.67,
      height: 30,
      zIndex: zIndex++,
      content: address2Content,
      fontFamily: "'Aspekta', sans-serif",
      fontSize: 25,
      fontWeight: 300,
      lineHeight: 1.1,
      textAlign: "left",
      color: "token:primary",
      binding: { field: "cityLine", type: "text" },
    };
    nodes.push(address2);
  }
  
  // ============================================================================
  // Decoration (Right Column)
  // ============================================================================
  
  const decorationSrc = extractImageSrc(html, "decoration");
  if (decorationSrc) {
    const decoration: ImageNode = {
      id: "decoration",
      type: "image",
      x: basePadding + 613.33,
      y: basePadding + 397 + 5,
      width: 306.66,
      height: 254,
      zIndex: zIndex++,
      src: decorationSrc,
      fit: "contain",
    };
    nodes.push(decoration);
  }
  
  // ============================================================================
  // Speaker Section (Bottom) - Same as MTL Code
  // ============================================================================
  
  // Speaker background
  const speakerBg: ShapeNode = {
    id: "speaker-bg",
    type: "shape",
    x: basePadding,
    y: basePadding + 397 + 264,
    width: 920,
    height: 529,
    zIndex: zIndex++,
    shapeType: "rectangle",
    fill: "token:secondary",
  };
  nodes.push(speakerBg);
  
  // Speaker name
  const speakerNameContent = extractTextContent(html, "Michael Masson");
  if (speakerNameContent) {
    const speakerName: TextNode = {
      id: "speaker-name",
      type: "text",
      x: basePadding + 40,
      y: basePadding + 397 + 264 + 40,
      width: 226.67,
      height: 40,
      zIndex: zIndex++,
      content: speakerNameContent,
      fontFamily: "'Aspekta', sans-serif",
      fontSize: 34,
      fontWeight: 500,
      lineHeight: 1.1,
      textAlign: "left",
      color: "#000000",
      binding: { field: "people[0].name", type: "text" },
    };
    nodes.push(speakerName);
  }
  
  // Speaker role
  const speakerRoleContent = extractTextContent(html, "CTO @ Botpress");
  if (speakerRoleContent) {
    const speakerRole: TextNode = {
      id: "speaker-role",
      type: "text",
      x: basePadding + 40,
      y: basePadding + 397 + 264 + 90,
      width: 226.67,
      height: 30,
      zIndex: zIndex++,
      content: speakerRoleContent,
      fontFamily: "'Aspekta', sans-serif",
      fontSize: 25,
      fontWeight: 300,
      lineHeight: 1.1,
      textAlign: "left",
      color: "#000000",
      binding: { field: "people[0].role", type: "text" },
    };
    nodes.push(speakerRole);
  }
  
  // Talk title
  const talkTitleContent = extractTextContent(html, "Kubernetes the right way");
  if (talkTitleContent) {
    const talkTitle: TextNode = {
      id: "talk-title",
      type: "text",
      x: basePadding + 40,
      y: basePadding + 397 + 264 + 150,
      width: 226.67,
      height: 200,
      zIndex: zIndex++,
      content: talkTitleContent,
      fontFamily: "'Aspekta', sans-serif",
      fontSize: 34,
      fontWeight: 500,
      lineHeight: 1.1,
      textAlign: "left",
      color: "#000000",
      binding: { field: "people[0].talkTitle", type: "text" },
    };
    nodes.push(talkTitle);
  }
  
  // Speaker photo
  const speakerPhotoSrc = extractSVGImageHref(html, "speaker-photo");
  if (speakerPhotoSrc) {
    const speakerPhoto: ImageNode = {
      id: "speaker-photo",
      type: "image",
      x: basePadding + 306.67,
      y: basePadding + 397 + 264 + 10,
      width: 603.33,
      height: 509,
      zIndex: zIndex++,
      src: speakerPhotoSrc,
      fit: "cover",
      binding: { field: "people[0].headshot", type: "image" },
    };
    nodes.push(speakerPhoto);
  }
  
  // ============================================================================
  // Create bindings
  // ============================================================================
  
  const bindings = nodes
    .filter(node => {
      if (node.type === "text") return (node as TextNode).binding;
      if (node.type === "image") return (node as ImageNode).binding;
      return false;
    })
    .map(node => {
      if (node.type === "text") {
        const textNode = node as TextNode;
        return {
          nodeId: textNode.id,
          field: textNode.binding!.field,
          type: "text" as const,
        };
      } else if (node.type === "image") {
        const imageNode = node as ImageNode;
        return {
          nodeId: imageNode.id,
          field: imageNode.binding!.field,
          type: "image" as const,
        };
      }
      return null;
    })
    .filter(Boolean) as Array<{ nodeId: string; field: string; type: "text" | "image" }>;
  
  // ============================================================================
  // Create tokens
  // ============================================================================
  
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
  
  // ============================================================================
  // Create schema
  // ============================================================================
  
  const schema: TemplateSchema = {
    id: `code-a-quebec-${variantNumber}`,
    name: "code-a-quebec",
    title: config.name,
    version: 1,
    dimensions: {
      width: config.width,
      height: config.height,
    },
    nodes,
    tokens,
    variants: [],
    bindings,
  };
  
  return schema;
}

// Re-export the main converter function
export async function convertHTMLToNodeGraph(
  templateFamily: string,
  variantNumber: string,
  config: TemplateConfig
): Promise<TemplateSchema | null> {
  // Route to specific converter based on template family
  if (templateFamily === "mtl-code") {
    return convertMTLCodeTemplate(variantNumber, config);
  }
  if (templateFamily === "code-a-quebec") {
    return convertCodeAQuebecTemplate(variantNumber, config);
  }
  return null;
}

