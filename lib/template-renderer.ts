import { Submission } from "@prisma/client";
import { renderTemplateWithConfig } from "@/lib/template-engine";
import { isNodeTemplate, getNodeTemplateSchema } from "@/lib/node-registry";
import { compileNodeGraphToHTML } from "@/lib/node-to-html-compiler";

const BASE_WIDTH = 1080;
const BASE_HEIGHT = 1350;

export function getPosterDimensions(scale: number) {
  return {
    width: BASE_WIDTH * scale,
    height: BASE_HEIGHT * scale,
  };
}

/**
 * Render template - supports both node graphs and legacy HTML
 * Phase 1: Dual-format support
 */
export async function renderTemplate(submission: Submission): Promise<string> {
  // Check if template uses node graph format
  const usesNodeGraph = await isNodeTemplate(submission.templateFamily);
  
  if (usesNodeGraph) {
    // Render using node graph compiler
    return renderNodeTemplate(submission);
  } else {
    // Render using legacy HTML template engine
    return renderTemplateWithConfig(submission);
  }
}

/**
 * Render template from node graph
 */
async function renderNodeTemplate(submission: Submission): Promise<string> {
  const schema = await getNodeTemplateSchema(submission.templateFamily);
  
  if (!schema) {
    // Fallback to legacy HTML if schema not found
    return renderTemplateWithConfig(submission);
  }
  
  // Extract variant from templateVariant (e.g., "mtl-code-1" -> "1")
  const variantId = submission.templateVariant.split("-").pop() || undefined;
  
  // Prepare data for binding
  const data = {
    eventTitle: submission.eventTitle,
    eventDate: submission.eventDate,
    doorTime: submission.doorTime,
    venueName: submission.venueName,
    addressLine: submission.addressLine,
    cityLine: submission.cityLine,
    primaryColor: submission.primaryColor,
    secondaryColor: submission.secondaryColor,
    people: JSON.parse(submission.people),
  };
  
  // Resolve color tokens
  const tokens: Record<string, string> = {};
  if (schema.tokens.primary) {
    tokens.primary = submission.primaryColor;
  }
  if (schema.tokens.secondary) {
    tokens.secondary = submission.secondaryColor;
  }
  
  // Compile node graph to HTML
  return compileNodeGraphToHTML(schema, {
    data,
    tokens,
    variantId,
  });
}
