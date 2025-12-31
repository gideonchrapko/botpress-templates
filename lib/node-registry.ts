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
 * Supports both schema.json (unified) and schema-layout-{variant}.json (variant-specific)
 */
export async function getNodeTemplateSchema(
  templateId: string,
  variantId?: string
): Promise<TemplateSchema | null> {
  const cacheKey = variantId ? `${templateId}-${variantId}` : templateId;
  
  // Check cache first
  if (schemaCache.has(cacheKey)) {
    return schemaCache.get(cacheKey)!;
  }

  // Try variant-specific layout schema first (schema-layout-{variant}.json)
  if (variantId) {
    const variantSchemaPath = join(process.cwd(), "templates", templateId, `schema-layout-${variantId}.json`);
    if (existsSync(variantSchemaPath)) {
      try {
        const schemaContent = await readFile(variantSchemaPath, "utf-8");
        const schema = JSON.parse(schemaContent) as TemplateSchema;
        schemaCache.set(cacheKey, schema);
        return schema;
      } catch {
        // Fall through to unified schema
      }
    }
  }

  // Try unified schema.json
  const schemaPath = join(process.cwd(), "templates", templateId, "schema.json");
  
  if (!existsSync(schemaPath)) {
    return null;
  }

  try {
    const schemaContent = await readFile(schemaPath, "utf-8");
    const schema = JSON.parse(schemaContent) as TemplateSchema;
    schemaCache.set(cacheKey, schema);
    return schema;
  } catch {
    return null;
  }
}

/**
 * Get template format (node or html)
 * Checks for schema.json, schema-layout-*.json (node) or template-*.html (html)
 */
export async function getTemplateFormat(templateFamily: string, variantId?: string): Promise<TemplateFormat> {
  // Check for variant-specific layout schema
  if (variantId) {
    const variantSchemaPath = join(process.cwd(), "templates", templateFamily, `schema-layout-${variantId}.json`);
    if (existsSync(variantSchemaPath)) {
      return "node";
    }
  }
  
  // Check for unified schema
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

