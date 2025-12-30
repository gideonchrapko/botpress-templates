/**
 * Node Graph Template Registry
 * Phase 1: Dual-format support (node graphs + legacy HTML)
 */

import { readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { TemplateSchema, TemplateFormat } from "./node-types";

const schemaCache: Map<string, TemplateSchema> = new Map();

/**
 * Load a node graph template schema from the database or file system
 */
export async function getNodeTemplateSchema(
  templateId: string
): Promise<TemplateSchema | null> {
  // Check cache first
  if (schemaCache.has(templateId)) {
    return schemaCache.get(templateId)!;
  }

  // For Phase 1, we'll load from file system
  // Later, this will load from database
  const schemaPath = join(process.cwd(), "templates", templateId, "schema.json");
  
  if (!existsSync(schemaPath)) {
    return null;
  }

  try {
    const schemaContent = await readFile(schemaPath, "utf-8");
    const schema = JSON.parse(schemaContent) as TemplateSchema;
    schemaCache.set(templateId, schema);
    return schema;
  } catch {
    return null;
  }
}

/**
 * Get template format (node or html)
 * For Phase 1, checks if schema.json exists (node) or template-*.html exists (html)
 */
export async function getTemplateFormat(templateFamily: string): Promise<TemplateFormat> {
  const schemaPath = join(process.cwd(), "templates", templateFamily, "schema.json");
  
  if (existsSync(schemaPath)) {
    return "node";
  }
  
  // Check if HTML template exists (legacy)
  const template1Path = join(process.cwd(), "templates", templateFamily, "template-1.html");
  if (existsSync(template1Path)) {
    return "html";
  }
  
  // Default to html for backwards compatibility
  return "html";
}

/**
 * Check if a template uses node graph format
 */
export async function isNodeTemplate(templateFamily: string): Promise<boolean> {
  const format = await getTemplateFormat(templateFamily);
  return format === "node";
}

