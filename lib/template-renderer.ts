import { Submission } from "@prisma/client";
import { renderTemplateWithConfig } from "@/lib/template-engine";
import { getTemplateFormat, getNodeTemplateSchema } from "@/lib/node-registry";
import { compileNodeGraphToHTML } from "@/lib/node-to-html-compiler-v2";
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
    // For blog-image-generator, schema is generated dynamically in renderNodeTemplate
    // For other templates, load from filesystem/database
    let schema: TemplateSchema | null = null;
    if (submission.templateFamily !== 'blog-image-generator') {
      schema = await getNodeTemplateSchema(submission.templateFamily, variantId);
    }
    
    // If schema exists or is blog-image-generator (generated dynamically), use node renderer
    if (schema || submission.templateFamily === 'blog-image-generator') {
      try {
        console.log(`[RENDER] Using node template renderer for ${submission.templateFamily}`);
        // Render using node graph compiler
        // For blog-image-generator, schema will be generated inside renderNodeTemplate
        // For others, pass the loaded schema
        const nodeHTML = await renderNodeTemplate(submission, schema, variantId);
        console.log(`[RENDER] Node template rendered successfully`);
        return nodeHTML;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`[RENDER] Node template render failed for ${submission.templateFamily}:`, errorMsg);
        console.error("Full error object:", error);
        // Don't fall back to HTML for blog-image-generator - it should always use node templates
        if (submission.templateFamily === 'blog-image-generator') {
          throw error; // Re-throw for blog-image-generator so we see the actual error
        }
        // Fall back to HTML renderer on error for other templates
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
async function renderNodeTemplate(submission: Submission, schema: TemplateSchema | null, variantId?: string): Promise<string> {
  
  // Load config to get date/time formatting
  const config = await getTemplateConfig(submission.templateFamily);
  
  if (!config) {
    throw new Error(`Config not found for template family: ${submission.templateFamily}`);
  }
  
  // Special handling for blog-image-generator: generate schema dynamically
  let finalSchema: TemplateSchema;
  if (submission.templateFamily === 'blog-image-generator') {
    const uploadUrls = JSON.parse(submission.uploadUrls || '{}');
    const selection = uploadUrls.selection;
    const components = uploadUrls.components || [];
    
    if (selection && components) {
      try {
        const { generateBlogImageNodeSchema } = await import('@/lib/blog-image-node-generator');
        const { DEFAULT_BLOG_IMAGE_CONFIG } = await import('@/lib/blog-image-template');
        
        console.log(`[RENDER] Generating blog image node schema...`);
        console.log(`[RENDER] Selection:`, JSON.stringify(selection, null, 2));
        console.log(`[RENDER] Components count:`, components.length);
        
        finalSchema = generateBlogImageNodeSchema(selection, components, DEFAULT_BLOG_IMAGE_CONFIG);
        console.log(`[RENDER] Schema generated successfully`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`[RENDER] Error generating blog image node schema:`, errorMsg);
        console.error("Full error:", error);
        throw error;
      }
    } else {
      console.error(`[RENDER] Missing data - selection:`, !!selection, `components:`, components?.length || 0);
      throw new Error(`Blog image selection data not found - selection: ${!!selection}, components: ${components?.length || 0}`);
    }
  } else {
    if (!schema) {
      throw new Error(`Schema not found for template family: ${submission.templateFamily}`);
    }
    finalSchema = schema;
  }
  
  // Prepare data for binding using shared resolver
  let data = prepareBindingData(submission, config);
  
  // For blog-image-generator, use component URLs directly
  if (submission.templateFamily === 'blog-image-generator') {
    const uploadUrls = JSON.parse(submission.uploadUrls || '{}');
    const selection = uploadUrls.selection;
    const components = uploadUrls.components || [];
    
    if (selection && components) {
      try {
        const { prepareBlogImageNodeData } = await import('@/lib/blog-image-node-generator');
        console.log(`[RENDER] Preparing blog image node data...`);
        data = prepareBlogImageNodeData(selection, components);
        console.log(`[RENDER] Data prepared:`, Object.keys(data));
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`[RENDER] Error preparing blog image node data:`, errorMsg);
        console.error("Full error:", error);
        throw error;
      }
    } else {
      console.error(`[RENDER] Missing data for prepareBlogImageNodeData - selection:`, !!selection, `components:`, components?.length || 0);
    }
  }
  
  // Resolve color tokens
  const tokens: Record<string, string> = {};
  if (finalSchema.tokens.primary) {
    tokens.primary = submission.primaryColor;
  }
  if (finalSchema.tokens.secondary) {
    tokens.secondary = submission.secondaryColor;
  }
  
  // Compile node graph to HTML
  let html: string;
  try {
    console.log(`[RENDER] Compiling node graph to HTML...`);
    html = compileNodeGraphToHTML(finalSchema, {
      data,
      tokens,
      variantId,
    });
    console.log(`[RENDER] HTML compiled successfully`);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[RENDER] Error compiling node graph to HTML:`, errorMsg);
    console.error("Full error:", error);
    throw error;
  }
  
  // Process assets (convert to base64 data URIs)
  try {
    console.log(`[RENDER] Processing node assets...`);
    html = await processNodeAssets(html, config, submission, finalSchema);
    console.log(`[RENDER] Assets processed successfully`);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[RENDER] Error processing node assets:`, errorMsg);
    console.error("Full error:", error);
    throw error;
  }
  
  // Process fonts
  try {
    console.log(`[RENDER] Processing fonts...`);
    html = await processNodeFonts(html);
    console.log(`[RENDER] Fonts processed successfully`);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[RENDER] Error processing fonts:`, errorMsg);
    console.error("Full error:", error);
    throw error;
  }
  
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
