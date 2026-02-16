/**
 * Figma Template Generator - MVP for Phase 3
 * Generates HTML template and config.json from Figma export
 */

import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { FigmaExport, FigmaExportNode, FigmaImportResult } from "./figma-import-types";
import { TemplateConfig } from "./template-registry";

/**
 * Extract binding from layer name
 * Detects patterns like "{{eventTitle}}" or "{{logo}}"
 */
function extractBinding(name: string): string | null {
  const match = name.match(/\{\{\s*([\w-]+)\s*\}\}/);
  return match ? match[1].trim() : null;
}

/**
 * Convert Figma color to hex
 */
function figmaColorToHex(color: { r: number; g: number; b: number; a?: number }): string {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  const a = color.a !== undefined ? Math.round(color.a * 255) : 255;
  
  if (a < 255) {
    return `rgba(${r}, ${g}, ${b}, ${a / 255})`;
  }
  return `#${[r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Find nodes by binding name
 */
function findNodesByBinding(nodes: FigmaExportNode[], bindingName: string): FigmaExportNode[] {
  const results: FigmaExportNode[] = [];
  
  function traverse(node: FigmaExportNode) {
    const binding = extractBinding(node.name);
    if (binding === bindingName) {
      results.push(node);
    }
    if (node.children) {
      node.children.forEach(traverse);
    }
  }
  
  nodes.forEach(traverse);
  return results;
}

/**
 * Find all nodes that should be rendered (bindings + static images/SVGs)
 */
function findAllRenderableNodes(nodes: FigmaExportNode[]): Array<{ node: FigmaExportNode; binding?: string; isStatic: boolean; parentFrame?: FigmaExportNode }> {
  const renderable: Array<{ node: FigmaExportNode; binding?: string; isStatic: boolean; parentFrame?: FigmaExportNode }> = [];
  
  function traverse(node: FigmaExportNode, parentFrame?: FigmaExportNode, immediateParent?: FigmaExportNode) {
    const binding = extractBinding(node.name);
    
    // Handle FRAME nodes with bindings (auto-expanding text frames)
    if (node.type === "FRAME" && binding) {
      renderable.push({ node, binding, isStatic: false });
      if (node.children) {
        node.children.forEach(child => traverse(child, node, node));
      }
      return;
    }
    
    // Skip GROUP nodes (containers only, no bindings)
    if (node.type === "GROUP") {
      if (node.children) {
        node.children.forEach(child => traverse(child, parentFrame, node));
      }
      return;
    }
    
    // Track FRAME nodes as potential parents
    const currentParentFrame = node.type === "FRAME" ? node : parentFrame;
    
    // Skip FRAME nodes without bindings (just containers) - but track them as parents
    if (node.type === "FRAME" && !binding) {
      if (node.children) {
        node.children.forEach(child => traverse(child, node, node));
      }
      return;
    }
    
    // Include nodes with bindings
    if (binding) {
      // Only render FRAME (with TEXT child) when this TEXT is a *direct* child of that FRAME.
      // TEXT inside GROUP (or other container) must be rendered as standalone text node so the placeholder is emitted.
      if (node.type === "TEXT" && parentFrame && parentFrame.type === "FRAME" && immediateParent === parentFrame) {
        renderable.push({ node: parentFrame, binding, isStatic: false, parentFrame: undefined });
      } else {
        renderable.push({ node, binding, isStatic: false, parentFrame });
      }
    }
    // Include static images (RECTANGLE with imageRef, or COMPONENT/INSTANCE)
    // Include static shapes: RECTANGLE/VECTOR/ELLIPSE with SOLID fill, or any such shape (even no fill) so vectors/decorations appear
    else if (
      (node.type === "RECTANGLE" && node.fills?.some(f => f.type === "IMAGE" && f.imageRef)) ||
      node.type === "COMPONENT" ||
      node.type === "INSTANCE"
    ) {
      renderable.push({ node, isStatic: true });
    } else if (
      node.type === "RECTANGLE" ||
      node.type === "VECTOR" ||
      node.type === "ELLIPSE"
    ) {
      renderable.push({ node, isStatic: true });
    }
    
    if (node.children) {
      node.children.forEach(child => traverse(child, currentParentFrame, node));
    }
  }
  
  nodes.forEach(node => traverse(node));
  return renderable;
}

/**
 * Generate HTML template from Figma export
 */
function generateHTMLTemplate(exportData: FigmaExport): string {
  const { width, height, nodes, images, svgs } = exportData;
  
  // Extract all bindings for field generation
  const allBindings = extractAllBindings(nodes);
  
  // Find all renderable nodes (bindings + static images)
  const renderableNodes = findAllRenderableNodes(nodes);
  
  // Get background color from root frame or Background rectangle
  let backgroundColor = "#ffffff";
  const rootFrame = nodes.find(n => n.type === "FRAME");
  
  // First, check for a Background rectangle child
  const backgroundRect = rootFrame?.children?.find(c => 
    c.type === "RECTANGLE" && (c.name?.toLowerCase().includes("background") || c.name === "Background")
  );
  
  if (backgroundRect?.fills && backgroundRect.fills.length > 0) {
    const fill = backgroundRect.fills[0];
    if (fill.type === "SOLID" && fill.color) {
      const { r, g, b, a } = fill.color;
      const red = Math.round(r * 255);
      const green = Math.round(g * 255);
      const blue = Math.round(b * 255);
      if (a < 1) {
        backgroundColor = `rgba(${red}, ${green}, ${blue}, ${a})`;
      } else {
        backgroundColor = `#${[red, green, blue].map(x => x.toString(16).padStart(2, '0')).join('')}`;
      }
    }
  } else if (rootFrame?.fills && rootFrame.fills.length > 0) {
    // Fallback to root frame fills
    const fill = rootFrame.fills[0];
    if (fill.type === "SOLID" && fill.color) {
      const { r, g, b, a } = fill.color;
      const red = Math.round(r * 255);
      const green = Math.round(g * 255);
      const blue = Math.round(b * 255);
      if (a < 1) {
        backgroundColor = `rgba(${red}, ${green}, ${blue}, ${a})`;
      } else {
        backgroundColor = `#${[red, green, blue].map(x => x.toString(16).padStart(2, '0')).join('')}`;
      }
    }
  }

  // Build HTML
  let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${exportData.name}</title>
    <link rel="stylesheet" href="fonts/font-face.css">
    <style>
        body {
            margin: 0;
            padding: 0;
            width: ${width}px;
            height: ${height}px;
            position: relative;
            overflow: hidden;
            background-color: ${backgroundColor};
        }
    </style>
</head>
<body>`;

  // Generate HTML for each renderable node
  // Track which FRAMEs we've already rendered to avoid duplicates
  const renderedFrames = new Set<string>();
  for (const { node, binding, isStatic, parentFrame } of renderableNodes) {
    if (isStatic) {
      // Static image (no binding - hardcoded in template)
      const imageRef = node.fills?.find(f => f.type === "IMAGE" && f.imageRef)?.imageRef;
      if (imageRef && images?.[imageRef]) {
        const imageStyle = `position: absolute; left: ${node.x}px; top: ${node.y}px; width: ${node.width}px; height: ${node.height}px; object-fit: contain;`;
        html += `
    <img src="${images[imageRef]}" alt="${node.name || 'Image'}" style="${imageStyle}">`;
      } else if (svgs?.[node.id]) {
        // Static shape with exported SVG - embed so vector appears in rendered template
        const svgDataUri = "data:image/svg+xml," + encodeURIComponent(svgs[node.id]);
        const imageStyle = `position: absolute; left: ${node.x}px; top: ${node.y}px; width: ${node.width}px; height: ${node.height}px; object-fit: contain;`;
        html += `
    <img src="${svgDataUri}" alt="${node.name || 'Shape'}" style="${imageStyle}">`;
      } else {
        // Static shape (RECTANGLE, VECTOR, or ELLIPSE) - SOLID fill or fallback for stroke-only/no-fill
        const solidFill = node.fills?.find((f: any) => f.type === "SOLID" && f.color);
        const bgColor = solidFill?.color ? figmaColorToHex(solidFill.color) : "rgba(0,0,0,0.08)";
        const isEllipse = node.type === "ELLIPSE";
        const shapeStyle = `position: absolute; left: ${node.x}px; top: ${node.y}px; width: ${node.width}px; height: ${node.height}px; background-color: ${bgColor};${isEllipse ? " border-radius: 50%;" : ""}`;
        html += `
    <div style="${shapeStyle}"></div>`;
      }
    } else if (binding) {
      // Node with binding (user upload or text field)
      const bindingInfo = allBindings.get(binding);
      if (bindingInfo) {
        if (bindingInfo.type === "image") {
          // Image/logo fields (user uploads) - use node position from Figma
          const imageStyle = `position: absolute; left: ${node.x}px; top: ${node.y}px; width: ${node.width}px; height: ${node.height}px; object-fit: contain; object-position: center;`;
          html += `
    <img src="{{${binding}}}" alt="${generateLabel(binding)}" style="${imageStyle}">`;
        } else if (node.type === "FRAME" && node.children) {
          // Auto-expanding text frame (FRAME with TEXT child)
          // Skip if we've already rendered this FRAME
          if (renderedFrames.has(node.id)) {
            continue;
          }
          renderedFrames.add(node.id);
          
          const textChild = node.children.find(c => c.type === "TEXT" && extractBinding(c.name) === binding);
          if (textChild) {
            const textStyle = textChild.style || {};
            const fontSize = textStyle.fontSize || 32;
            const fontWeight = textStyle.fontWeight || 400;
            const fontFamily = textStyle.fontFamily ? `'${textStyle.fontFamily}', sans-serif` : "'Aspekta', sans-serif";
            const textAlign = textStyle.textAlign?.toLowerCase() || "left";
            const fill = textStyle.fill || "#000000";
            
            // Get frame background color - use placeholder that will be replaced with primaryColor
            // Store the original color as a placeholder for replacement
            let frameBg = "{{primaryColor}}";
            if (node.fills && node.fills.length > 0) {
              const frameFill = node.fills[0];
              if (frameFill.type === "SOLID" && frameFill.color) {
                const { r, g, b, a } = frameFill.color;
                const red = Math.round(r * 255);
                const green = Math.round(g * 255);
                const blue = Math.round(b * 255);
                if (a < 1) {
                  frameBg = `rgba(${red}, ${green}, ${blue}, ${a})`;
                } else {
                  const hexColor = `#${[red, green, blue].map(x => x.toString(16).padStart(2, '0')).join('')}`;
                  // Use the hex color as a placeholder that will be replaced
                  frameBg = hexColor;
                }
              }
            }
            
            // Get padding from text position relative to frame
            // Text child position is relative to the frame
            const paddingLeft = Math.max(0, textChild.x || 0);
            const paddingRight = Math.max(0, node.width - (textChild.x + textChild.width) || 0);
            
            // Frame with text that stays on one line - use flexbox for perfect centering
            html += `
    <div style="position: absolute; left: ${node.x}px; top: ${node.y}px; width: ${node.width}px; height: ${node.height}px; background-color: ${frameBg}; display: flex; align-items: center; justify-content: ${textAlign === "center" ? "center" : textAlign === "right" ? "flex-end" : "flex-start"}; padding-left: ${paddingLeft}px; padding-right: ${paddingRight}px; box-sizing: border-box; overflow: hidden;">
        <div style="font-family: ${fontFamily}; font-size: ${fontSize}px; font-weight: ${fontWeight}; color: ${fill}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;">
            {{${binding}}}
        </div>
    </div>`;
          }
        } else {
          // Regular text/date fields
          const textStyle = node.style || {};
          const fontSize = textStyle.fontSize || 48;
          const fontWeight = textStyle.fontWeight || 400;
          const fontFamily = textStyle.fontFamily ? `'${textStyle.fontFamily}', sans-serif` : "'Aspekta', sans-serif";
          const textAlign = textStyle.textAlign?.toLowerCase() || "left";
          const fill = textStyle.fill || "#000000";
          
          html += `
    <div style="position: absolute; left: ${node.x}px; top: ${node.y}px; width: ${node.width}px; height: ${node.height}px; font-family: ${fontFamily}; font-size: ${fontSize}px; font-weight: ${fontWeight}; color: ${fill}; text-align: ${textAlign}; display: flex; align-items: center; ${textAlign === "center" ? "justify-content: center;" : ""}">
        {{${binding}}}
    </div>`;
        }
      }
    }
  }
  
  html += `
</body>
</html>`;
  
  return html;
}

/**
 * Extract all bindings from nodes
 */
function extractAllBindings(nodes: FigmaExportNode[]): Map<string, { node: FigmaExportNode; type: string }> {
  const bindings = new Map<string, { node: FigmaExportNode; type: string }>();
  
  function traverse(node: FigmaExportNode) {
    const binding = extractBinding(node.name);
    if (binding) {
      // Infer field type from node type
      let fieldType: string;
      if (node.type === "TEXT") {
        // Special case: if binding name contains "date" or "Date", treat as date field
        if (binding.toLowerCase().includes("date")) {
          fieldType = "date";
        } else {
          fieldType = "text";
        }
      } else if (node.type === "FRAME") {
        // FRAME with binding = auto-expanding text field
        fieldType = "text";
      } else if (node.type === "RECTANGLE" || node.type === "VECTOR" || node.type === "COMPONENT" || node.type === "INSTANCE") {
        // Image/logo fields
        fieldType = "image";
      } else {
        // Default to text for other types
        fieldType = "text";
      }
      
      // Only add if not already present (FRAME takes priority over TEXT child)
      if (!bindings.has(binding)) {
        bindings.set(binding, { node, type: fieldType });
      } else if (node.type === "FRAME") {
        // FRAME binding overrides TEXT child binding
        bindings.set(binding, { node, type: fieldType });
      }
    }
    if (node.children) {
      node.children.forEach(traverse);
    }
  }
  
  nodes.forEach(traverse);
  return bindings;
}

/**
 * Generate human-readable label from binding name
 */
function generateLabel(bindingName: string): string {
  // Convert camelCase or snake_case to Title Case
  return bindingName
    .replace(/([A-Z])/g, " $1") // Add space before capital letters
    .replace(/_/g, " ") // Replace underscores with spaces
    .replace(/^\w/, (c) => c.toUpperCase()) // Capitalize first letter
    .trim();
}

/**
 * Generate config.json from Figma export
 */
function generateConfig(exportData: FigmaExport): TemplateConfig {
  const { name, width, height, nodes } = exportData;
  
  // Generate template ID from name (lowercase, replace spaces with hyphens)
  const templateId = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  
  // Detect ALL fields from bindings (user-controlled naming)
  const fields: TemplateConfig["fields"] = [];
  const allBindings = extractAllBindings(nodes);
  
  // Process each binding found
  for (const [bindingName, { node, type }] of allBindings) {
    const label = generateLabel(bindingName);
    const placeholder = `Enter ${label.toLowerCase()}`;
    
    if (type === "text") {
      fields.push({
        type: "text",
        name: bindingName,
        label: label,
        placeholder: placeholder,
        maxLength: 100,
        replacements: [
          { pattern: `{{${bindingName}}}`, type: "text" }
        ]
      });
    } else if (type === "date") {
      fields.push({
        type: "date",
        name: bindingName,
        label: label,
        format: "MMMM", // Default to month format, can be customized
        locale: "en",
        replacements: [
          { pattern: `{{${bindingName}}}`, type: "date" }
        ]
      });
    } else if (type === "image") {
      fields.push({
        type: "image",
        name: bindingName,
        label: label,
        replacements: [
          { pattern: `{{${bindingName}}}`, type: "image" }
        ]
      });
    }
  }
  
  // Always add primary color field
  fields.push({
    type: "color",
    name: "primaryColor",
    label: "Primary Color",
    default: "#3D9DFF",
    replacements: [
      { pattern: "#3D9DFF", type: "color" }
    ]
  });
  
  return {
    id: templateId,
    name: name,
    width: width,
    height: height,
    variants: ["1"],
    format: "html", // MVP: Generate HTML templates
    fields: fields,
    assets: {
      logo: {
        default: "mtl-code-wide.svg", // Default logo, can be updated
        swap: {}
      }
    },
    colorReplacements: {}
  };
}

/**
 * Generate template files from Figma export
 * Stores templates in database (production-ready) with filesystem fallback for development
 */
export async function generateTemplateFromFigma(
  exportData: FigmaExport
): Promise<FigmaImportResult> {
  const templateId = exportData.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  
  // Generate config.json
  const config = generateConfig(exportData);
  
  // Generate template-1.html
  const html = generateHTMLTemplate(exportData);
  
  // Store in database (production-ready)
  const { prisma } = await import("@/lib/prisma");
  
  try {
    // Check if template already exists (for variant 2 detection)
    const existing = await prisma.template.findUnique({
      where: { family: templateId },
    });
    
    // Detect if this is variant 2: if template exists and has htmlContent, store as variant 2
    const isVariant2 = existing && existing.htmlContent && !existing.htmlVariant2;
    
    // Update config to include both variants if variant 2 detected
    if (isVariant2) {
      config.variants = ["1", "2"];
    }
    
    await prisma.template.upsert({
      where: { family: templateId },
      update: {
        name: config.name,
        title: config.name,
        format: "html",
        width: config.width,
        height: config.height,
        configJson: JSON.stringify(config, null, 2),
        // If variant 1 exists, store this as variant 2
        ...(isVariant2 ? { htmlVariant2: html } : { htmlContent: html }),
        updatedAt: new Date(),
      },
      create: {
        family: templateId,
        name: config.name,
        title: config.name,
        format: "html",
        width: config.width,
        height: config.height,
        configJson: JSON.stringify(config, null, 2),
        htmlContent: html,
      },
    });
  } catch (error) {
    console.error("Failed to store template in database:", error);
    // Fallback to filesystem for development
    const templateDir = join(process.cwd(), "templates", templateId);
    
    if (!existsSync(templateDir)) {
      await mkdir(templateDir, { recursive: true });
    }
    
    const configPath = join(templateDir, "config.json");
    await writeFile(configPath, JSON.stringify(config, null, 2));
    
    const htmlPath = join(templateDir, "template-1.html");
    await writeFile(htmlPath, html);
  }
  
  return {
    templateId: templateId,
    templatePath: `database:${templateId}`,
    configPath: `database:${templateId}/config.json`,
    htmlPath: `database:${templateId}/template-1.html`,
    message: `Template "${config.name}" created successfully in database!`
  };
}
