import { Submission } from "@prisma/client";
import { renderTemplateWithConfig } from "@/lib/template-engine";
import { getTemplateFormat, getNodeTemplateSchema } from "@/lib/node-registry";
import { compileNodeGraphToHTML } from "@/lib/node-to-html-compiler";
import { getTemplateConfig } from "@/lib/template-registry";
import { TemplateSchema } from "@/lib/node-types";
import { prepareBindingData } from "@/lib/field-resolver";
import { readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { lightenColor } from "@/lib/utils";
import { ImageNode, TemplateNode, isImageNode } from "./node-types";

const BASE_WIDTH = 1080;
const BASE_HEIGHT = 1350;

export function getPosterDimensions(scale: number) {
  return {
    width: BASE_WIDTH * scale,
    height: BASE_HEIGHT * scale,
  };
}

/**
 * Render template - Hybrid system supporting both node graphs and HTML
 * 
 * Routing logic:
 * 1. Check config.json for explicit format setting
 * 2. If format is "node", use node renderer (with HTML fallback on error)
 * 3. If format is "html" or undefined, use HTML renderer
 * 4. Auto-detect based on file presence if format not specified
 */
export async function renderTemplate(submission: Submission): Promise<string> {
  // Extract variant from templateVariant (e.g., "mtl-code-1" -> "1")
  const variantId = submission.templateVariant.split("-").pop() || undefined;

  // Get template format (checks config.json first, then file presence)
  const format = await getTemplateFormat(submission.templateFamily, variantId);
  
  // If format is explicitly "node", try node renderer first
  if (format === "node") {
    const schema = await getNodeTemplateSchema(submission.templateFamily, variantId);
    
    if (schema) {
      try {
        // Render using node graph compiler
        const nodeHTML = await renderNodeTemplate(submission, schema, variantId);
        return nodeHTML;
      } catch (error) {
        console.error("Node template render failed, falling back to HTML:", error);
        // Fall back to HTML renderer on error
        return renderTemplateWithConfig(submission);
      }
    } else {
      // Schema not found, fall back to HTML
      console.warn(`Node schema not found for ${submission.templateFamily}, falling back to HTML`);
      return renderTemplateWithConfig(submission);
    }
  }
  
  // Format is "html" or undefined - use HTML renderer
  return renderTemplateWithConfig(submission);
}

/**
 * Render template from node graph
 */
async function renderNodeTemplate(submission: Submission, schema: TemplateSchema, variantId?: string): Promise<string> {
  
  // Load config to get date/time formatting
  const config = await getTemplateConfig(submission.templateFamily);
  
  if (!config) {
    throw new Error(`Config not found for template family: ${submission.templateFamily}`);
  }
  
  // Prepare data for binding using shared resolver
  const data = prepareBindingData(submission, config);
  
  // Resolve color tokens
  const tokens: Record<string, string> = {};
  if (schema.tokens.primary) {
    tokens.primary = submission.primaryColor;
  }
  if (schema.tokens.secondary) {
    tokens.secondary = submission.secondaryColor;
  }
  
  // Compile node graph to HTML
  let html = compileNodeGraphToHTML(schema, {
    data,
    tokens,
    variantId,
  });
  
  // Process assets (convert to base64 data URIs)
  html = await processNodeAssets(html, config, submission, schema);
  
  // Process fonts
  html = await processNodeFonts(html);
  
  return html;
}

// Process assets for node templates (convert to base64)
async function processNodeAssets(
  html: string,
  config: any,
  submission: Submission,
  schema: any
): Promise<string> {
  const assetsDir = join(process.cwd(), "public", "assets");
  
  // Helper to convert file to base64 data URI
  const fileToDataUri = async (filePath: string): Promise<string | null> => {
    if (!existsSync(filePath)) {
      return null;
    }
    try {
      const fileBuffer = await readFile(filePath);
      const ext = filePath.split(".").pop()?.toLowerCase();
      let mimeType = "image/png";
      if (ext === "svg") mimeType = "image/svg+xml";
      else if (ext === "jpg" || ext === "jpeg") mimeType = "image/jpeg";
      else if (ext === "png") mimeType = "image/png";
      else if (ext === "webp") mimeType = "image/webp";
      const base64 = fileBuffer.toString("base64");
      return `data:${mimeType};base64,${base64}`;
    } catch {
      return null;
    }
  };
  
  // Get logo file name (with swap logic)
  const logoFile = config.assets.logo.swap[submission.templateFamily] || config.assets.logo.default;
  
  // Process all image nodes
  const nodesToProcess = schema.root?.children || schema.nodes || [];
  for (const node of nodesToProcess) {
    if (isImageNode(node)) {
      const imageNode = node as ImageNode;
      let src = imageNode.src || "";
      
      // Skip if already a data URI or bound to user upload
      if (src.startsWith("data:") || !src.includes("assets/")) {
        continue;
      }
      
      // Handle logo swap
      if (src.includes("mtl-code-wide.svg") && logoFile !== "mtl-code-wide.svg") {
        src = src.replace("mtl-code-wide.svg", logoFile);
      }
      if (src.includes("code-@-québec") && logoFile !== "code-@-québec-long.svg") {
        src = src.replace(/code-@-québec[^"]*/, logoFile);
      }
      
      // Extract asset file name
      const assetMatch = src.match(/assets\/([^"]+)/);
      if (!assetMatch) continue;
      
      let assetFile = assetMatch[1];
      
      // Skip speaker photos (handled separately)
      if (assetFile === "speaker-photo.png") {
        continue;
      }
      
      const assetPath = join(assetsDir, assetFile);
      
      // Special handling for decoration.svg - replace primary color
      if (assetFile === config.assets?.decoration?.file) {
        let svgContent = await readFile(assetPath, "utf-8");
        if (config.assets.decoration.colorReplacements) {
          for (const color of config.assets.decoration.colorReplacements) {
            svgContent = svgContent.replace(new RegExp(color, "g"), submission.primaryColor);
          }
        }
        const base64 = Buffer.from(svgContent).toString("base64");
        const dataUri = `data:image/svg+xml;base64,${base64}`;
        html = html.replace(new RegExp(`src="${src.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, "g"), `src="${dataUri}"`);
      } else {
        const dataUri = await fileToDataUri(assetPath);
        if (dataUri) {
          html = html.replace(new RegExp(`src="${src.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, "g"), `src="${dataUri}"`);
        }
      }
    }
  }
  
  // Process speaker photos (from uploadUrls) - handle both img src and SVG href
  // Safely parse people and uploadUrls, defaulting to empty arrays if undefined/null/empty
  let people: any[] = [];
  let uploadUrls: string[] = [];
  try {
    if (submission.people && typeof submission.people === "string" && submission.people.trim() !== "") {
      people = JSON.parse(submission.people);
      if (!Array.isArray(people)) people = [];
    }
  } catch {
    people = [];
  }
  try {
    if (submission.uploadUrls && typeof submission.uploadUrls === "string" && submission.uploadUrls.trim() !== "") {
      uploadUrls = JSON.parse(submission.uploadUrls);
      if (!Array.isArray(uploadUrls)) uploadUrls = [];
    }
  } catch {
    uploadUrls = [];
  }
  
  for (let i = 0; i < people.length; i++) {
    const headshotDataUri = uploadUrls[i];
    if (headshotDataUri) {
      // Replace speaker-photo.png in img src
      html = html.replace(/src="[^"]*speaker-photo\.png[^"]*"/g, `src="${headshotDataUri}"`);
      // Replace in SVG href (for masked images) - need to match the full href attribute
      html = html.replace(/href="[^"]*speaker-photo\.png[^"]*"/g, `href="${headshotDataUri}"`);
      // Also replace data URIs that might have been set
      html = html.replace(/href="data:[^"]*"/g, (match) => {
        if (match.includes("speaker-photo")) {
          return `href="${headshotDataUri}"`;
        }
        return match;
      });
    }
  }
  
  return html;
}

// Process fonts for node templates
async function processNodeFonts(html: string): Promise<string> {
  const fontsDir = join(process.cwd(), "public", "fonts");
  const fontFacePath = join(fontsDir, "font-face.css");
  
  if (!existsSync(fontFacePath)) {
    return html;
  }
  
  let fontFaceCss = await readFile(fontFacePath, "utf-8");
  
  // Replace relative font paths with base64 data URIs
  const fontPathRegex = /url\(['"]?([^'")]+)['"]?\)/g;
  const fontReplacements: Array<{ original: string; replacement: string }> = [];
  
  let match;
  while ((match = fontPathRegex.exec(fontFaceCss)) !== null) {
    const fontPath = match[1];
    if (fontPath.startsWith("../") || !fontPath.startsWith("http")) {
      const fullFontPath = join(fontsDir, fontPath.replace("../", ""));
      if (existsSync(fullFontPath)) {
        try {
          const fontBuffer = await readFile(fullFontPath);
          const ext = fullFontPath.split(".").pop()?.toLowerCase();
          let mimeType = "font/woff2";
          if (ext === "woff") mimeType = "font/woff";
          else if (ext === "woff2") mimeType = "font/woff2";
          else if (ext === "ttf") mimeType = "font/ttf";
          else if (ext === "otf") mimeType = "font/otf";
          const base64 = fontBuffer.toString("base64");
          const dataUri = `data:${mimeType};base64,${base64}`;
          fontReplacements.push({
            original: match[0],
            replacement: `url('${dataUri}')`,
          });
        } catch {
          // Skip if can't read font
        }
      }
    }
  }
  
  for (const replacement of fontReplacements) {
    fontFaceCss = fontFaceCss.replace(replacement.original, replacement.replacement);
  }
  
  // Inject font CSS into HTML
  if (!html.includes("<style>") || !html.includes("font-face")) {
    html = html.replace("</head>", `<style>${fontFaceCss}</style>\n</head>`);
  }
  
  return html;
}
