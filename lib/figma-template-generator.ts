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
 * Extract the first path's "d" attribute from an SVG string (e.g. from Figma export).
 * Used to build a mask from a vector shape.
 */
function extractPathDFromSvg(svgString: string): string | null {
  if (!svgString || typeof svgString !== "string") return null;
  // Path: allow d= with optional whitespace/newlines
  const pathMatch = svgString.match(/<path[^>]*\sd=["']([^"']*)["']/);
  if (pathMatch) return pathMatch[1].trim();
  const rectMatch = svgString.match(/<rect[^>]*\s+width=["']([^"']*)["'][^>]*height=["']([^"']*)["']/);
  if (rectMatch) {
    const w = parseFloat(rectMatch[1]) || 100;
    const h = parseFloat(rectMatch[2]) || 100;
    return `M0 0h${w}v${h}H0V0z`;
  }
  const ellipseMatch = svgString.match(/<ellipse[^>]*\s+cx=["']([^"']*)["'][^>]*cy=["']([^"']*)["'][^>]*rx=["']([^"']*)["'][^>]*ry=["']([^"']*)["']/);
  if (ellipseMatch) {
    const cx = parseFloat(ellipseMatch[1]) || 0;
    const cy = parseFloat(ellipseMatch[2]) || 0;
    const rx = parseFloat(ellipseMatch[3]) || 50;
    const ry = parseFloat(ellipseMatch[4]) || 50;
    return `M${cx - rx},${cy}a${rx},${ry} 0 1,1 ${2 * rx},0a${rx},${ry} 0 1,1 -${2 * rx},0`;
  }
  return null;
}

/** Ellipse path that fills the given width and height (for fallback when mask SVG is not in export). */
function ellipsePathD(width: number, height: number): string {
  const cx = width / 2;
  const cy = height / 2;
  const rx = width / 2;
  const ry = height / 2;
  return `M${cx - rx},${cy} a${rx},${ry} 0 1,1 ${width},0 a${rx},${ry} 0 1,1 -${width},0`;
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
 * Check if a GROUP is a "masked image" group: one child is the mask shape (VECTOR/RECTANGLE/ELLIPSE)
 * and one child is the image (RECTANGLE with IMAGE fill). Returns { maskNode, imageNode, binding } or null.
 */
function asMaskedImageGroup(group: FigmaExportNode): { maskNode: FigmaExportNode; imageNode: FigmaExportNode; binding: string | null } | null {
  if (group.type !== "GROUP" || !group.children || group.children.length !== 2) return null;
  const [a, b] = group.children;
  const hasImageFill = (n: FigmaExportNode) => n.fills?.some((f: any) => f.type === "IMAGE" && f.imageRef);
  const isShape = (n: FigmaExportNode) => n.type === "VECTOR" || n.type === "RECTANGLE" || n.type === "ELLIPSE";
  let maskNode: FigmaExportNode | null = null;
  let imageNode: FigmaExportNode | null = null;
  if (hasImageFill(a) && isShape(b)) {
    imageNode = a;
    maskNode = b;
  } else if (hasImageFill(b) && isShape(a)) {
    imageNode = b;
    maskNode = a;
  }
  if (!maskNode || !imageNode) return null;
  const binding = extractBinding(imageNode.name);
  return { maskNode, imageNode, binding };
}

/** Escape HTML so static text is safe to insert. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Resolve Figma line height to CSS value for 1:1 match.
 * Prefers lineHeightPx; else PERCENT (fontSize * value/100); else AUTO/normal.
 */
function getLineHeightCss(
  style: FigmaExportNode["style"],
  fontSize: number,
  fallbackHeight?: number
): string {
  if (!style) return "normal";
  if (style.lineHeightPx != null && style.lineHeightPx > 0) return `${style.lineHeightPx}px`;
  if (style.lineHeightUnit === "PERCENT" && style.lineHeightValue != null && style.lineHeightValue > 0) {
    const px = Math.round((fontSize * style.lineHeightValue) / 100);
    return `${px}px`;
  }
  if (style.lineHeightUnit === "PIXELS" && style.lineHeightValue != null && style.lineHeightValue > 0) {
    return `${style.lineHeightValue}px`;
  }
  if (fallbackHeight != null && fallbackHeight > 0 && fontSize > 0) {
    return `${Math.min(fallbackHeight, Math.round(fontSize * 1.2))}px`;
  }
  return "normal";
}

/**
 * Collect TEXT nodes that are direct children of the frame, or the only TEXT inside a direct GROUP child.
 * This supports both FRAME > [TEXT, TEXT] and FRAME > [GROUP, GROUP] where each GROUP has one TEXT.
 */
function collectTextLinesFromFrame(frame: FigmaExportNode): Array<{ node: FigmaExportNode; binding?: string }> {
  const lines: Array<{ node: FigmaExportNode; binding?: string }> = [];
  if (!frame.children) return lines;
  for (const child of frame.children) {
    if (child.type === "TEXT") {
      lines.push({ node: child, binding: extractBinding(child.name) || undefined });
    } else if (child.type === "GROUP" && child.children?.length === 1 && child.children[0].type === "TEXT") {
      const textNode = child.children[0];
      lines.push({ node: textNode, binding: extractBinding(textNode.name) || undefined });
    }
  }
  return lines;
}

/**
 * Check if a FRAME is a "multi-line text block": 2+ TEXT lines (direct TEXT children or one TEXT per GROUP child).
 * Lines can have a binding ({{name}}) or be static (use node.characters).
 */
function asMultiLineTextBlock(frame: FigmaExportNode): { frame: FigmaExportNode; lines: Array<{ node: FigmaExportNode; binding?: string }> } | null {
  if (frame.type !== "FRAME") return null;
  const lines = collectTextLinesFromFrame(frame);
  if (lines.length < 2) return null;
  return { frame, lines };
}

type RenderableEntry = {
  node: FigmaExportNode;
  binding?: string;
  isStatic: boolean;
  parentFrame?: FigmaExportNode;
  maskedImage?: { maskNode: FigmaExportNode; imageNode: FigmaExportNode };
  textBlock?: { frame: FigmaExportNode; lines: Array<{ node: FigmaExportNode; binding?: string }> };
};

/**
 * Find all nodes that should be rendered (bindings + static images/SVGs)
 */
function findAllRenderableNodes(nodes: FigmaExportNode[]): RenderableEntry[] {
  const renderable: RenderableEntry[] = [];
  const skipNodeIds = new Set<string>();

  function traverse(node: FigmaExportNode, parentFrame?: FigmaExportNode, immediateParent?: FigmaExportNode) {
    if (skipNodeIds.has(node.id)) return;

    const binding = extractBinding(node.name);
    
    // Handle FRAME nodes with bindings (auto-expanding text frames)
    if (node.type === "FRAME" && binding) {
      renderable.push({ node, binding, isStatic: false });
      if (node.children) {
        node.children.forEach(child => traverse(child, node, node));
      }
      return;
    }
    
    // FRAME without binding: check for multi-line text block (2+ TEXT children with bindings)
    if (node.type === "FRAME" && !binding && node.children) {
      const block = asMultiLineTextBlock(node);
      if (block) {
        block.lines.forEach(({ node: textNode }) => skipNodeIds.add(textNode.id));
        renderable.push({ node, isStatic: false, textBlock: block });
        return;
      }
      node.children.forEach(child => traverse(child, node, node));
      return;
    }
    
    // GROUP: check for masked image group (mask shape + image). If so, emit one renderable and skip children.
    if (node.type === "GROUP") {
      const masked = asMaskedImageGroup(node);
      if (masked) {
        skipNodeIds.add(masked.maskNode.id);
        skipNodeIds.add(masked.imageNode.id);
        renderable.push({
          node,
          binding: masked.binding ?? undefined,
          isStatic: !masked.binding,
          maskedImage: { maskNode: masked.maskNode, imageNode: masked.imageNode },
        });
        return;
      }
      if (node.children) {
        node.children.forEach(child => traverse(child, parentFrame, node));
      }
      return;
    }
    
    // Track FRAME nodes as potential parents
    const currentParentFrame = node.type === "FRAME" ? node : parentFrame;
    
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
    // Static text: TEXT node with no binding — show the layer's characters as-is on the template
    else if (node.type === "TEXT" && !binding) {
      renderable.push({ node, isStatic: true });
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

/** Collect all unique font families and weights from the node tree for loading. */
function collectFontFamilies(nodes: FigmaExportNode[]): Set<{ family: string; weight: number }> {
  const out = new Set<{ family: string; weight: number }>();
  function visit(n: FigmaExportNode) {
    if (n.style?.fontFamily) {
      out.add({ family: n.style.fontFamily, weight: n.style.fontWeight ?? 400 });
    }
    n.children?.forEach(visit);
  }
  nodes.forEach(visit);
  return out;
}

/**
 * Generate HTML template from Figma export
 */
function generateHTMLTemplate(exportData: FigmaExport): string {
  const { width, height, nodes, images, svgs } = exportData;
  const fontSet = collectFontFamilies(nodes);
  const fontFamilies = [...fontSet];
  const googleFontsFamilies = fontFamilies
    .filter((f) => f.family && f.family !== "Aspekta")
    .map((f) => `family=${encodeURIComponent(f.family.replace(/\s+/g, "+"))}:wght@${f.weight}`);
  const googleFontsUrl =
    googleFontsFamilies.length > 0
      ? `https://fonts.googleapis.com/css2?${googleFontsFamilies.join("&")}&display=swap`
      : null;

  if (process.env.NODE_ENV === "development") {
    const textNodes: Array<{ name: string; style?: unknown; characters?: string; x: number; y: number; width: number; height: number }> = [];
    function collectText(n: FigmaExportNode) {
      if (n.type === "TEXT") textNodes.push({ name: n.name, style: n.style, characters: n.characters, x: n.x, y: n.y, width: n.width, height: n.height });
      n.children?.forEach(collectText);
    }
    nodes.forEach(collectText);
    if (textNodes.length > 0) {
      console.log("[FIGMA-IMPORT] TEXT nodes sample (first 3):", JSON.stringify(textNodes.slice(0, 3), null, 2));
      const missingStyle = textNodes.filter((t) => {
        const s = t.style as { fontSize?: number; fontFamily?: string } | undefined;
        return !s?.fontSize || !s?.fontFamily;
      });
      if (missingStyle.length > 0) {
        console.warn("[FIGMA-IMPORT] Some TEXT nodes missing style.fontSize or style.fontFamily — rebuild plugin and ensure export sends style for every TEXT node. Count:", missingStyle.length);
      }
    }
  }

  const svgCount = svgs ? Object.keys(svgs).filter((id) => String(svgs[id]).trim().length > 0).length : 0;
  if (process.env.NODE_ENV === "development") {
    if (svgCount === 0) {
      console.warn(
        "[FIGMA-IMPORT] No SVG data in payload (svgs empty or missing). Shapes will use fallback rect/ellipse. " +
          "Use the CLI script with FIGMA_ACCESS_TOKEN, or have the plugin call node.exportAsync({ format: 'SVG' }) and include results in svgs."
      );
    } else {
      const shapeNodeIds = new Set<string>();
      function collectShapeIds(n: FigmaExportNode) {
        if (n.type === "VECTOR" || n.type === "RECTANGLE" || n.type === "ELLIPSE") shapeNodeIds.add(n.id);
        n.children?.forEach(collectShapeIds);
      }
      nodes.forEach(collectShapeIds);
      const matched = [...shapeNodeIds].filter((id) => svgs?.[id] && String(svgs[id]).trim().length > 0).length;
      console.log("[FIGMA-IMPORT] SVGs in payload:", svgCount, "| Shape nodes in tree:", shapeNodeIds.size, "| Matched:", matched);
      if (matched < shapeNodeIds.size && shapeNodeIds.size > 0) {
        console.warn("[FIGMA-IMPORT] Some shape node ids have no SVG. Example shape ids:", [...shapeNodeIds].slice(0, 5), "| Example svg keys:", Object.keys(svgs || {}).slice(0, 5));
      }
    }
  }

  // Extract all bindings for field generation
  const allBindings = extractAllBindings(nodes);
  
  // Find all renderable nodes (bindings + static images)
  const renderableNodes = findAllRenderableNodes(nodes);
  const textBlockCount = renderableNodes.filter((e) => e.textBlock).length;
  if (process.env.NODE_ENV === "development") {
    console.log("[FIGMA-IMPORT] Root nodes:", nodes.length, "types:", nodes.map((n) => n.type).join(", "));
    console.log("[FIGMA-IMPORT] Renderable entries:", renderableNodes.length, "text blocks:", textBlockCount);
    if (textBlockCount === 0) {
      function countFrameTextKids(n: FigmaExportNode): number {
        if (n.type !== "FRAME" || !n.children) return 0;
        const fromGroups = n.children.filter((c) => c.type === "GROUP").flatMap((g) => g.children?.filter((cc) => cc.type === "TEXT") ?? []);
        const direct = n.children.filter((c) => c.type === "TEXT");
        return direct.length + fromGroups.length;
      }
      const framesWithMultipleText = nodes.filter((n) => n.type === "FRAME" && countFrameTextKids(n) >= 2);
      if (framesWithMultipleText.length > 0) {
        console.warn("[FIGMA-IMPORT] No text block detected but found", framesWithMultipleText.length, "frame(s) with 2+ TEXT (direct or in GROUP). Frame names:", framesWithMultipleText.map((f) => f.name || f.id));
      }
    }
  }

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
    <link rel="stylesheet" href="fonts/font-face.css">${googleFontsUrl ? `\n    <link rel="stylesheet" href="${googleFontsUrl}">` : ""}
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
  for (const entry of renderableNodes) {
    const { node, binding, isStatic, parentFrame, maskedImage, textBlock } = entry;

    // Multi-line text block: one wrapper div (same text box) with multiple styled lines
    if (textBlock) {
      const { frame, lines } = textBlock;
      if (process.env.NODE_ENV === "development") {
        const lineSummary = lines.map((l, i) => {
          const binding = l.binding ? `binding=${l.binding}` : "";
          const chars = (l.node.characters ?? "").slice(0, 40);
          return `line${i + 1}: ${binding || `characters=${chars ? `"${chars}..."` : "(empty)"}`}`;
        });
        console.log("[FIGMA-IMPORT] Text block:", frame.name || frame.id, "lines:", lines.length, lineSummary);
      }
      let frameBg = "transparent";
      if (frame.fills && frame.fills.length > 0) {
        const frameFill = frame.fills[0];
        if (frameFill.type === "SOLID" && (frameFill as { color?: { r: number; g: number; b: number; a?: number } }).color) {
          const c = (frameFill as { color: { r: number; g: number; b: number; a?: number } }).color;
          frameBg = figmaColorToHex(c);
        }
      }
      const boxStyle = `position: absolute; left: ${frame.x}px; top: ${frame.y}px; width: ${frame.width}px; height: ${frame.height}px; background-color: ${frameBg}; box-sizing: border-box; overflow: visible;`;
      html += `
    <div class="text-block" style="${boxStyle}">`;
      for (let i = 0; i < lines.length; i++) {
        const { node: textNode, binding: lineBinding } = lines[i];
        const textStyle = textNode.style || {};
        const fontSize = textStyle.fontSize ?? 16;
        const fontWeight = textStyle.fontWeight ?? 400;
        const fontFamily = textStyle.fontFamily ? `'${textStyle.fontFamily}', sans-serif` : "'Aspekta', sans-serif";
        const textAlign = (textStyle.textAlign || "LEFT").toLowerCase().replace("justified", "left");
        const fill = textStyle.fill || "#000000";
        const w = Math.max(textNode.width ?? 100, 1);
        const h = Math.max(textNode.height ?? 24, 1);
        const relX = textNode.x - frame.x;
        const relY = textNode.y - frame.y;
        const lineLeft = relX >= 0 && relY >= 0 ? relX : textNode.x;
        const lineTop = relX >= 0 && relY >= 0 ? relY : textNode.y;
        const letterSpacing = textStyle.letterSpacing != null ? `letter-spacing: ${textStyle.letterSpacing}px;` : "";
        const lineHeightCss = getLineHeightCss(textStyle, fontSize, h);
        const hasNewlines = (textNode.characters ?? "").includes("\n");
        const whiteSpace = hasNewlines ? "pre-line" : "nowrap";
        const lineStyle = `position: absolute; left: ${lineLeft}px; top: ${lineTop}px; width: ${w}px; min-height: ${h}px; margin: 0; padding: 0; font-family: ${fontFamily}; font-size: ${fontSize}px; font-weight: ${fontWeight}; color: ${fill}; text-align: ${textAlign}; line-height: ${lineHeightCss}; ${letterSpacing} display: flex; align-items: flex-start; ${textAlign === "center" ? "justify-content: center;" : textAlign === "right" ? "justify-content: flex-end;" : ""} white-space: ${whiteSpace}; overflow: visible; box-sizing: border-box;`;
        const rawContent = textNode.characters ?? "";
        const lineContent = lineBinding
          ? `{{${lineBinding}}}`
          : rawContent !== ""
            ? escapeHtml(rawContent)
            : "\u00A0"; // Non-breaking space so the line box doesn't collapse when plugin omits characters
        html += `
      <div class="text-block-line" data-line="${i + 1}" style="${lineStyle}">${lineContent}</div>`;
      }
      html += `
    </div>`;
      continue;
    }

    // Masked image group: one SVG with mask + image so the image appears clipped by the mask
    if (maskedImage) {
      const { maskNode, imageNode } = maskedImage;
      // Prefer mask node SVG, then GROUP SVG (export script requests group SVG; Figma returns it with the mask path), then ellipse fallback
      const maskSvgA = svgs?.[maskNode.id] && String(svgs[maskNode.id]).trim();
      const maskSvgB = svgs?.[node.id] && String(svgs[node.id]).trim();
      const maskPath =
        (maskSvgA && extractPathDFromSvg(maskSvgA)) ||
        (maskSvgB && extractPathDFromSvg(maskSvgB)) ||
        ellipsePathD(node.width || 100, node.height || 100);
      const imageRef = imageNode.fills?.find((f: any) => f.type === "IMAGE" && f.imageRef)?.imageRef;
      let imageHref = binding ? `{{${binding}}}` : (imageRef && images?.[imageRef] ? images[imageRef] : "");
      const maskId = `mask-${node.id.replace(/[^a-zA-Z0-9]/g, "-")}`;
      const w = node.width || 100;
      const h = node.height || 100;
      const viewBox = `0 0 ${w} ${h}`;
      const style = `position: absolute; left: ${node.x}px; top: ${node.y}px; width: ${w}px; height: ${h}px; overflow: hidden;`;
      const safePathD = maskPath.replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      html += `
    <div style="${style}">
      <svg width="100%" height="100%" viewBox="${viewBox}" preserveAspectRatio="xMidYMid meet" style="display: block;">
        <defs>
          <mask id="${maskId}">
            <rect width="100%" height="100%" fill="black"/>
            <path d="${safePathD}" fill="white"/>
          </mask>
        </defs>
        <image href="${imageHref}" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" mask="url(#${maskId})"/>
      </svg>
    </div>`;
      continue;
    }

    if (isStatic) {
      // Static text (no {{binding}} — print the layer's characters as-is, exact position/size/font from Figma)
      if (node.type === "TEXT") {
        const textStyle = node.style || {};
        const fontSize = textStyle.fontSize ?? 16;
        const fontWeight = textStyle.fontWeight ?? 400;
        const fontFamily = textStyle.fontFamily ? `'${textStyle.fontFamily}', sans-serif` : "'Aspekta', sans-serif";
        const textAlign = (textStyle.textAlign || "LEFT").toLowerCase().replace("justified", "left");
        const fill = textStyle.fill || "#000000";
        const w = Math.max(node.width ?? 100, 1);
        const h = Math.max(node.height ?? 24, 1);
        const letterSpacing = textStyle.letterSpacing != null ? `letter-spacing: ${textStyle.letterSpacing}px;` : "";
        const lineHeightCss = getLineHeightCss(node.style, fontSize, h);
        const rawChars = node.characters ?? "";
        const hasNewlines = rawChars.includes("\n");
        const whiteSpace = hasNewlines ? "pre-line" : "normal";
        const style = `position: absolute; left: ${node.x}px; top: ${node.y}px; width: ${w}px; height: ${h}px; margin: 0; padding: 0; font-family: ${fontFamily}; font-size: ${fontSize}px; font-weight: ${fontWeight}; color: ${fill}; text-align: ${textAlign}; line-height: ${lineHeightCss}; ${letterSpacing} white-space: ${whiteSpace}; display: flex; align-items: flex-start; ${textAlign === "center" ? "justify-content: center;" : textAlign === "right" ? "justify-content: flex-end;" : ""} box-sizing: border-box; overflow: hidden;`;
        const content = rawChars !== "" ? escapeHtml(rawChars) : "\u00A0";
        html += `
    <div style="${style}">${content}</div>`;
        continue;
      }
      // Static image (no binding - hardcoded in template)
      const imageRef = node.fills?.find(f => f.type === "IMAGE" && f.imageRef)?.imageRef;
      if (imageRef && images?.[imageRef]) {
        const imageStyle = `position: absolute; left: ${node.x}px; top: ${node.y}px; width: ${node.width}px; height: ${node.height}px; object-fit: contain;`;
        html += `
    <img src="${images[imageRef]}" alt="${node.name || 'Image'}" style="${imageStyle}">`;
      } else if (svgs?.[node.id] && String(svgs[node.id]).trim().length > 0) {
        // Static shape with exported SVG - embed so vector appears in rendered template
        const svgDataUri = "data:image/svg+xml," + encodeURIComponent(svgs[node.id]);
        const imageStyle = `position: absolute; left: ${node.x}px; top: ${node.y}px; width: ${node.width}px; height: ${node.height}px; object-fit: contain;`;
        html += `
    <img src="${svgDataUri}" alt="${node.name || 'Shape'}" style="${imageStyle}">`;
      } else {
        // No SVG from export: use inline SVG so shape still shows (rect or ellipse with solid fill)
        const solidFill = node.fills?.find((f: any) => f.type === "SOLID" && f.color);
        const fillColor = solidFill?.color ? figmaColorToHex(solidFill.color) : "rgba(0,0,0,0.08)";
        const w = node.width || 100;
        const h = node.height || 100;
        const style = `position: absolute; left: ${node.x}px; top: ${node.y}px; width: ${w}px; height: ${h}px; overflow: visible;`;
        const viewBox = `0 0 ${w} ${h}`;
        if (node.type === "ELLIPSE") {
          const cx = w / 2;
          const cy = h / 2;
          const rx = w / 2;
          const ry = h / 2;
          html += `
    <svg style="${style}" viewBox="${viewBox}" preserveAspectRatio="none"><ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fillColor}"/></svg>`;
        } else {
          html += `
    <svg style="${style}" viewBox="${viewBox}" preserveAspectRatio="none"><rect width="${w}" height="${h}" fill="${fillColor}"/></svg>`;
        }
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
            
            // Padding from text position relative to frame (1:1 with Figma margins/inset)
            const paddingLeft = Math.max(0, textChild.x || 0);
            const paddingRight = Math.max(0, node.width! - (textChild.x! + textChild.width!) || 0);
            const paddingTop = Math.max(0, textChild.y || 0);
            const paddingBottom = Math.max(0, node.height! - (textChild.y! + textChild.height!) || 0);
            const lineHeightCss = getLineHeightCss(textChild.style, fontSize, textChild.height);
            const letterSpacing = textChild.style?.letterSpacing != null ? `letter-spacing: ${textChild.style.letterSpacing}px;` : "";

            html += `
    <div style="position: absolute; left: ${node.x}px; top: ${node.y}px; width: ${node.width}px; height: ${node.height}px; margin: 0; padding: ${paddingTop}px ${paddingRight}px ${paddingBottom}px ${paddingLeft}px; background-color: ${frameBg}; display: flex; align-items: flex-start; justify-content: ${textAlign === "center" ? "center" : textAlign === "right" ? "flex-end" : "flex-start"}; box-sizing: border-box; overflow: hidden;">
        <div style="margin: 0; padding: 0; font-family: ${fontFamily}; font-size: ${fontSize}px; font-weight: ${fontWeight}; line-height: ${lineHeightCss}; ${letterSpacing} color: ${fill}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;">
            {{${binding}}}
        </div>
    </div>`;
          }
        } else {
          // Regular text/date fields (TEXT node with binding)
          const textStyle = node.style || {};
          const fontSize = textStyle.fontSize || 48;
          const fontWeight = textStyle.fontWeight || 400;
          const fontFamily = textStyle.fontFamily ? `'${textStyle.fontFamily}', sans-serif` : "'Aspekta', sans-serif";
          const textAlign = textStyle.textAlign?.toLowerCase() || "left";
          const fill = textStyle.fill || "#000000";
          const lineHeightCss = getLineHeightCss(textStyle, fontSize, node.height);
          const letterSpacing = textStyle.letterSpacing != null ? `letter-spacing: ${textStyle.letterSpacing}px;` : "";

          html += `
    <div style="position: absolute; left: ${node.x}px; top: ${node.y}px; width: ${node.width}px; height: ${node.height}px; margin: 0; padding: 0; font-family: ${fontFamily}; font-size: ${fontSize}px; font-weight: ${fontWeight}; line-height: ${lineHeightCss}; ${letterSpacing} color: ${fill}; text-align: ${textAlign}; display: flex; align-items: flex-start; ${textAlign === "center" ? "justify-content: center;" : textAlign === "right" ? "justify-content: flex-end;" : ""} box-sizing: border-box; overflow: hidden;">
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
        // All TEXT bindings are text fields (date is entered manually by the user)
        fieldType = "text";
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
