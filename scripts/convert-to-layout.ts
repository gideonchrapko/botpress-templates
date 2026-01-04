#!/usr/bin/env bun
/**
 * Convert HTML Template to Layout Node Graph
 * Maps HTML flexbox structure to layout nodes (Frame, Flex, Box)
 * Usage: bun scripts/convert-to-layout.ts <template-family> <variant-number>
 * Example: bun scripts/convert-to-layout.ts mtl-code 1
 */

import { convertHTMLToLayoutNodes } from "../lib/html-to-layout-converter";
import { getTemplateConfig } from "../lib/template-registry";
import { writeFile } from "fs/promises";
import { join } from "path";

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error("Usage: bun scripts/convert-to-layout.ts <template-family> <variant-number>");
    console.error("Example: bun scripts/convert-to-layout.ts mtl-code 1");
    process.exit(1);
  }
  
  const [templateFamily, variantNumber] = args;
  
  console.log(`🔄 Converting ${templateFamily} variant ${variantNumber} to layout nodes...`);
  
  // Load config
  const config = await getTemplateConfig(templateFamily);
  if (!config) {
    console.error(`❌ Config not found for ${templateFamily}`);
    process.exit(1);
  }
  
  // Convert
  const schema = await convertHTMLToLayoutNodes(templateFamily, variantNumber, config);
  
  if (!schema) {
    console.error(`❌ Failed to convert template`);
    process.exit(1);
  }
  
  // Save schema
  const outputPath = join(
    process.cwd(),
    "templates",
    templateFamily,
    `schema-layout-${variantNumber}.json`
  );
  
  await writeFile(outputPath, JSON.stringify(schema, null, 2));
  
  console.log(`✅ Layout schema saved to: ${outputPath}`);
  console.log(`📊 Root frame: ${schema.root?.width}x${schema.root?.height}`);
  console.log(`🔗 Bindings: ${schema.bindings.length}`);
  console.log(`🎨 Tokens: ${Object.keys(schema.tokens).length}`);
}

main().catch(console.error);

