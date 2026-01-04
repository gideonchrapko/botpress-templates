#!/usr/bin/env bun
/**
 * Create Unified Schema from Variant Schemas
 * Combines schema-1.json, schema-2.json, schema-3.json into a single schema.json
 * with variants defined
 */

import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { TemplateSchema, Variant } from "../lib/node-types";

async function createUnifiedSchema(templateFamily: string) {
  console.log(`🔄 Creating unified schema for ${templateFamily}...`);
  
  const templatesDir = join(process.cwd(), "templates", templateFamily);
  
  // Load all variant schemas
  const variants: Array<{ id: string; schema: TemplateSchema }> = [];
  
  for (let i = 1; i <= 3; i++) {
    const variantPath = join(templatesDir, `schema-${i}.json`);
    if (existsSync(variantPath)) {
      const content = await readFile(variantPath, "utf-8");
      const schema = JSON.parse(content) as TemplateSchema;
      variants.push({ id: i.toString(), schema });
    }
  }
  
  if (variants.length === 0) {
    console.error(`❌ No variant schemas found for ${templateFamily}`);
    return;
  }
  
  // Use first variant as base
  const baseSchema = variants[0].schema;
  
  // Create variant definitions (hide/show nodes that differ)
  const variantDefs: Variant[] = [];
  
  // For variant 2 and 3, we need to identify which nodes to hide
  // This is a simplified approach - in reality, we'd compare node structures
  for (let i = 1; i < variants.length; i++) {
    const variantId = (i + 1).toString();
    const variantSchema = variants[i].schema;
    
    // Find nodes that exist in base but not in variant (or vice versa)
    const baseNodes = baseSchema.root?.children || baseSchema.nodes || [];
    const variantNodes = variantSchema.root?.children || variantSchema.nodes || [];
    const baseNodeIds = new Set(baseNodes.map(n => n.id));
    const variantNodeIds = new Set(variantNodes.map(n => n.id));
    
    const overrides: Array<{ nodeId: string; operation: "hide" | "show" }> = [];
    
    // Hide nodes that don't exist in this variant
    for (const nodeId of baseNodeIds) {
      if (!variantNodeIds.has(nodeId)) {
        overrides.push({ nodeId, operation: "hide" });
      }
    }
    
    // Show nodes that exist in variant but not in base
    for (const nodeId of variantNodeIds) {
      if (!baseNodeIds.has(nodeId)) {
        overrides.push({ nodeId, operation: "show" });
      }
    }
    
    if (overrides.length > 0) {
      variantDefs.push({
        id: variantId,
        name: `Variant ${variantId}`,
        overrides,
      });
    }
  }
  
  // Create unified schema
  const unifiedSchema: TemplateSchema = {
    ...baseSchema,
    id: templateFamily,
    variants: variantDefs,
  };
  
  // Save unified schema
  const outputPath = join(templatesDir, "schema.json");
  await writeFile(outputPath, JSON.stringify(unifiedSchema, null, 2));
  
  console.log(`✅ Unified schema saved to: ${outputPath}`);
  const baseNodeCount = baseSchema.root?.children?.length || baseSchema.nodes?.length || 0;
  console.log(`📊 Base nodes: ${baseNodeCount}`);
  console.log(`🔄 Variants: ${variantDefs.length}`);
}

// Main
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: bun scripts/create-unified-schema.ts <template-family>");
  console.error("Example: bun scripts/create-unified-schema.ts mtl-code");
  process.exit(1);
}

createUnifiedSchema(args[0]).catch(console.error);

