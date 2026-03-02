#!/usr/bin/env bun
/**
 * Convert HTML Template to Node Graph
 * Usage: bun scripts/convert-template.ts <template-family> <variant-number>
 * Example: bun scripts/convert-template.ts mtl-code 1
 */

import { convertHTMLToNodeGraph } from "../lib/html-to-node-converter";
import { getTemplateConfig } from "../lib/template-registry";
import { writeFile } from "fs/promises";
import { join } from "path";

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error("Usage: bun scripts/convert-template.ts <template-family> <variant-number>");
    console.error("Example: bun scripts/convert-template.ts mtl-code 1");
    process.exit(1);
  }
  
  const [templateFamily, variantNumber] = args;
  
  console.log(`🔄 Converting ${templateFamily} variant ${variantNumber}...`);
  
  // Load config
  const config = await getTemplateConfig(templateFamily);
  if (!config) {
    console.error(`❌ Config not found for ${templateFamily}`);
    process.exit(1);
  }
  
  // Convert
  const schema = await convertHTMLToNodeGraph(templateFamily, variantNumber, config);
  
  if (!schema) {
    console.error(`❌ Failed to convert template`);
    process.exit(1);
  }
  
  // Save schema
  const outputPath = join(
    process.cwd(),
    "templates",
    templateFamily,
    `schema-${variantNumber}.json`
  );
  
  await writeFile(outputPath, JSON.stringify(schema, null, 2));
  
  console.log(`✅ Schema saved to: ${outputPath}`);
  const nodeCount = schema.root?.children?.length || schema.nodes?.length || 0;
  console.log(`📊 Nodes: ${nodeCount}`);
  console.log(`🔗 Bindings: ${schema.bindings.length}`);
  console.log(`🎨 Tokens: ${Object.keys(schema.tokens).length}`);
}

main().catch(console.error);

