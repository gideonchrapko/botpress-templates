#!/usr/bin/env tsx
/**
 * Test Figma import directly (bypasses auth for testing)
 * Usage: bun run scripts/test-import-direct.ts [filename]
 * Example: bun run scripts/test-import-direct.ts december-layout-export.json
 */

import { generateTemplateFromFigma } from "@/lib/figma-template-generator";
import { readFile } from "fs/promises";
import { join } from "path";

async function testImport() {
  try {
    // Get file path from command line args or use default
    const args = process.argv.slice(2);
    const fileName = args[0] || "figma-export-example.json";
    const exportPath = join(process.cwd(), "examples", fileName);
    
    // Check if file exists
    const { existsSync } = await import("fs");
    if (!existsSync(exportPath)) {
      console.error(`❌ Error: File not found: examples/${fileName}`);
      console.error(`\nAvailable files in examples/:`);
      const { readdir } = await import("fs/promises");
      const files = await readdir(join(process.cwd(), "examples"));
      files.filter(f => f.endsWith(".json")).forEach(f => console.error(`   - ${f}`));
      process.exit(1);
    }
    
    console.log(`📂 Reading: ${fileName}`);
    const exportData = JSON.parse(await readFile(exportPath, "utf-8"));
    
    console.log("📦 Importing template...");
    console.log(`   Name: ${exportData.name}`);
    console.log(`   Size: ${exportData.width}x${exportData.height}`);
    console.log(`   Nodes: ${exportData.nodes.length}`);
    
    const result = await generateTemplateFromFigma(exportData);
    
    console.log("\n✅ Import successful!");
    console.log(`   Template ID: ${result.templateId}`);
    console.log(`   Message: ${result.message}`);
    
    // Verify it's in the database
    const { prisma } = await import("@/lib/prisma");
    const template = await prisma.template.findUnique({
      where: { family: result.templateId },
    });
    
    if (template) {
      console.log("\n📋 Template in database:");
      console.log(`   Family: ${template.family}`);
      console.log(`   Name: ${template.name}`);
      console.log(`   Format: ${template.format}`);
      console.log(`   Has configJson: ${!!template.configJson}`);
      console.log(`   Has htmlContent: ${!!template.htmlContent}`);
    } else {
      console.log("\n❌ Template not found in database!");
    }
    
    process.exit(0);
  } catch (error: any) {
    console.error("\n❌ Import failed:");
    console.error(error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

testImport();
